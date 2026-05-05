// app/api/cron/check-installments/route.js
//
// Vercel Cron fires this at 09:00 PM UTC daily (= 02:30 AM IST).
// It also fires manually if you call it with the correct secret.
//
// Security: Vercel sets the "Authorization: Bearer <CRON_SECRET>" header
// automatically. We validate it here. For manual test calls pass the same header.
//
// Flow:
//   1. Auth check
//   2. Load all bookings from Firestore (client SDK — same as rest of app)
//   3. For each pending installment, decide if a notification should fire today
//   4. Check the dedup store (installmentNotifSent collection) — skip if already sent
//   5. createNotification() → writes to Firestore + triggers push via /api/send-push
//   6. Write dedup record
//   7. Return a JSON summary log

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { createNotification } from "@/firebase/notificationsService";
import {
  toDate,
  getTrigger,
  dedupKey,
  buildNotifPayload,
  extractPendingInstallments,
} from "@/lib/installmentChecker";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOG_PREFIX = "[cron/check-installments]";

// Dedup TTL: records older than this are considered expired.
// 90 days is generous — overdue keys include the date so they self-rotate anyway.
const DEDUP_TTL_DAYS = 90;

// ─── Auth helper ─────────────────────────────────────────────────────────────

function isAuthorized(request) {
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If no secret is configured, only allow in development
    if (process.env.NODE_ENV === "development") return true;
    console.error(`${LOG_PREFIX} CRON_SECRET env var is not set`);
    return false;
  }
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${cronSecret}`;
}

// ─── Dedup helpers ────────────────────────────────────────────────────────────

/**
 * Check if a notification has already been sent for this key.
 * Returns true if already sent (should skip), false if fresh (should send).
 */
async function isAlreadySent(key) {
  try {
    const snap = await getDoc(doc(db, "installmentNotifSent", key));
    if (!snap.exists()) return false;

    // Sanity-check TTL: treat ancient records as expired
    const sentAt = snap.data()?.sentAt;
    if (sentAt) {
      const sentDate = toDate(sentAt);
      if (sentDate) {
        const ageMs = Date.now() - sentDate.getTime();
        if (ageMs > DEDUP_TTL_DAYS * 24 * 60 * 60 * 1000) {
          console.log(`${LOG_PREFIX} Dedup TTL expired for key: ${key}`);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    // On read error, err on the side of NOT sending (avoid spam)
    console.error(`${LOG_PREFIX} isAlreadySent check failed for key "${key}":`, err.message);
    return true;
  }
}

/**
 * Mark a key as sent. Non-blocking — failures are logged but don't abort the run.
 */
async function markSent(key, metadata = {}) {
  try {
    await setDoc(doc(db, "installmentNotifSent", key), {
      sentAt: serverTimestamp(),
      ...metadata,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to write dedup key "${key}":`, err.message);
  }
}

// ─── Booking loader ───────────────────────────────────────────────────────────

/**
 * Load all bookings that are not cancelled and have at least one service.
 * We filter broadly here; precise filtering happens per-payment in the checker.
 */
async function loadActiveBookings() {
  const snap = await getDocs(
    query(
      collection(db, "bookings"),
      where("status", "not-in", ["Cancelled", "Completed"])
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Notification sender ──────────────────────────────────────────────────────

/**
 * Send one notification via the existing createNotification() helper.
 * Returns true on success, false on failure.
 */
async function sendInstallmentNotif({ userId, payload, key }) {
  try {
    await createNotification({
      userId,
      type:     payload.type,
      title:    payload.title,
      message:  payload.message,
      link:     payload.link,
      priority: payload.priority,
      metadata: { dedupKey: key, source: "cron/check-installments" },
    });
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX} createNotification failed for key "${key}":`, err.message);
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request) {
  const runStart = Date.now();

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  if (!isAuthorized(request)) {
    console.warn(`${LOG_PREFIX} Unauthorized request`);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowUtc = new Date();
  console.log(`${LOG_PREFIX} Run started at ${nowUtc.toISOString()}`);

  // Summary counters for the response log
  const summary = {
    bookingsScanned: 0,
    installmentsChecked: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,   // already sent (dedup)
    notificationsFailed: 0,
    errors: [],
  };

  // ── 2. Load bookings ─────────────────────────────────────────────────────
  let bookings = [];
  try {
    bookings = await loadActiveBookings();
    summary.bookingsScanned = bookings.length;
    console.log(`${LOG_PREFIX} Loaded ${bookings.length} active booking(s)`);
  } catch (err) {
    const msg = `Failed to load bookings: ${err.message}`;
    console.error(`${LOG_PREFIX}`, msg);
    summary.errors.push(msg);
    return Response.json({ ok: false, summary }, { status: 500 });
  }

  // ── 3. Process each booking ───────────────────────────────────────────────
  for (const booking of bookings) {
    const bookingId = booking.id;
    const agentId   = booking.agentId;

    if (!agentId) {
      console.warn(`${LOG_PREFIX} Booking ${bookingId} has no agentId — skipping`);
      summary.errors.push(`Booking ${bookingId}: missing agentId`);
      continue;
    }

    // Extract all pending installments from this booking
    let installments;
    try {
      installments = extractPendingInstallments(bookingId, booking);
    } catch (err) {
      const msg = `Booking ${bookingId}: extractPendingInstallments threw — ${err.message}`;
      console.error(`${LOG_PREFIX}`, msg);
      summary.errors.push(msg);
      continue;
    }

    if (installments.length === 0) continue;

    // ── 4. Check each installment ────────────────────────────────────────
    for (const inst of installments) {
      summary.installmentsChecked++;

      const { service, serviceIdx, payment, paymentKey } = inst;
      const dueDate = payment._resolvedDate;

      // Determine which trigger fires today (if any)
      let trigger;
      try {
        trigger = getTrigger(dueDate, nowUtc);
      } catch (err) {
        const msg = `Booking ${bookingId} svc${serviceIdx} ${paymentKey}: getTrigger threw — ${err.message}`;
        console.error(`${LOG_PREFIX}`, msg);
        summary.errors.push(msg);
        continue;
      }

      if (!trigger) {
        // Nothing to do for this installment today
        continue;
      }

      // Build dedup key
      const key = dedupKey(bookingId, serviceIdx, paymentKey, trigger, nowUtc);

      // ── 5. Dedup check ─────────────────────────────────────────────────
      const alreadySent = await isAlreadySent(key);
      if (alreadySent) {
        summary.notificationsSkipped++;
        console.log(`${LOG_PREFIX} Skipping (already sent): ${key}`);
        continue;
      }

      // ── 6. Build payload and send ──────────────────────────────────────
      let payload;
      try {
        payload = buildNotifPayload({ booking, service, payment, trigger, bookingId });
      } catch (err) {
        const msg = `Booking ${bookingId} svc${serviceIdx} ${paymentKey}: buildNotifPayload threw — ${err.message}`;
        console.error(`${LOG_PREFIX}`, msg);
        summary.errors.push(msg);
        continue;
      }

      console.log(
        `${LOG_PREFIX} Sending [${trigger}] → agent ${agentId} | ${payload.title}`
      );

      const sent = await sendInstallmentNotif({ userId: agentId, payload, key });

      if (sent) {
        summary.notificationsSent++;
        // ── 7. Write dedup record ────────────────────────────────────────
        await markSent(key, {
          bookingId,
          agentId,
          trigger,
          serviceType: service.type,
          serviceDescription: service.description || "",
          amount: payment.amount,
          dueDate: payment.date,
        });
      } else {
        summary.notificationsFailed++;
        summary.errors.push(
          `Failed to send [${trigger}] for booking ${bookingId} svc${serviceIdx} ${paymentKey}`
        );
      }
    }
  }

  // ── 8. Final log & response ───────────────────────────────────────────────
  const elapsed = Date.now() - runStart;
  console.log(
    `${LOG_PREFIX} Run complete in ${elapsed}ms |`,
    JSON.stringify(summary)
  );

  return Response.json({
    ok:      summary.notificationsFailed === 0 && summary.errors.length === 0,
    elapsed: `${elapsed}ms`,
    summary,
  });
}

// Block every other HTTP method
export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}