// app/api/cron/check-installments/route.js
//
// Vercel Cron fires this once daily at 02:30 AM IST (= 21:00 UTC previous day).
// Also fires manually with the correct secret.
//
// Flow:
//   1. Auth check
//   2. Load all active bookings from Firestore
//   3. For each booking:
//      a. Check pending vendor payment installments → notify on due dates
//      b. Check pending services → notify 7d, 2d, 1d, 0d before trip startDate
//   4. Dedup via installmentNotifSent collection (shared with client hook)
//   5. createNotification() → Firestore + push via /api/send-push
//   6. Return JSON summary log

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { createNotification } from "@/firebase/notificationsService";
import {
  toDate,
  getTrigger,
  dedupKey,
  buildNotifPayload,
  extractPendingInstallments,
  getServiceTrigger,
  serviceReminderDedupKey,
  buildServiceReminderPayload,
} from "@/lib/installmentChecker";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOG_PREFIX = "[cron/check-installments]";
const DEDUP_TTL_DAYS = 90;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") return true;
    console.error(`${LOG_PREFIX} CRON_SECRET env var is not set`);
    return false;
  }
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${cronSecret}`;
}

// ─── Dedup helpers ────────────────────────────────────────────────────────────

async function isAlreadySent(key) {
  try {
    const snap = await getDoc(doc(db, "installmentNotifSent", key));
    if (!snap.exists()) return false;

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
    console.error(`${LOG_PREFIX} isAlreadySent check failed for key "${key}":`, err.message);
    return true; // conservative — avoid spam on error
  }
}

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

async function sendNotif({ userId, payload, key }) {
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

  // ── 1. Auth ───────────────────────────────────────────────────────────────
  if (!isAuthorized(request)) {
    console.warn(`${LOG_PREFIX} Unauthorized request`);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowUtc = new Date();
  console.log(`${LOG_PREFIX} Run started at ${nowUtc.toISOString()}`);

  const summary = {
    bookingsScanned: 0,
    installmentsChecked: 0,
    servicesChecked: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    notificationsFailed: 0,
    errors: [],
  };

  // ── 2. Load bookings ──────────────────────────────────────────────────────
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

    // ── 3a. Vendor payment installments ────────────────────────────────────
    let installments;
    try {
      installments = extractPendingInstallments(bookingId, booking);
    } catch (err) {
      const msg = `Booking ${bookingId}: extractPendingInstallments threw — ${err.message}`;
      console.error(`${LOG_PREFIX}`, msg);
      summary.errors.push(msg);
      installments = [];
    }

    for (const inst of installments) {
      summary.installmentsChecked++;

      const { service, serviceIdx, payment, paymentKey } = inst;
      const dueDate = payment._resolvedDate;

      let trigger;
      try {
        trigger = getTrigger(dueDate, nowUtc);
      } catch (err) {
        const msg = `Booking ${bookingId} svc${serviceIdx} ${paymentKey}: getTrigger threw — ${err.message}`;
        console.error(`${LOG_PREFIX}`, msg);
        summary.errors.push(msg);
        continue;
      }

      if (!trigger) continue;

      const key = dedupKey(bookingId, serviceIdx, paymentKey, trigger, nowUtc);

      const alreadySent = await isAlreadySent(key);
      if (alreadySent) {
        summary.notificationsSkipped++;
        console.log(`${LOG_PREFIX} Skipping installment (already sent): ${key}`);
        continue;
      }

      let payload;
      try {
        payload = buildNotifPayload({ booking, service, payment, trigger, bookingId });
      } catch (err) {
        const msg = `Booking ${bookingId} svc${serviceIdx} ${paymentKey}: buildNotifPayload threw — ${err.message}`;
        console.error(`${LOG_PREFIX}`, msg);
        summary.errors.push(msg);
        continue;
      }

      console.log(`${LOG_PREFIX} Installment [${trigger}] → agent ${agentId} | ${payload.title}`);

      const sent = await sendNotif({ userId: agentId, payload, key });
      if (sent) {
        summary.notificationsSent++;
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
          `Failed to send installment [${trigger}] for booking ${bookingId} svc${serviceIdx} ${paymentKey}`
        );
      }
    }

    // ── 3b. Pending service reminders (7d, 2d, 1d, 0d before startDate) ────
    const startDate = booking.startDate;
    if (!startDate) continue;

    const services = booking.services || [];

    for (let svcIdx = 0; svcIdx < services.length; svcIdx++) {
      const service = services[svcIdx];

      // Only alert on services still in Pending state
      if (service.status !== "Pending") continue;

      summary.servicesChecked++;

      // Determine which trigger fires today relative to trip start
      const trigger = getServiceTrigger(startDate, nowUtc);
      if (!trigger) continue;

      const key = serviceReminderDedupKey(bookingId, svcIdx, trigger, nowUtc);

      const alreadySent = await isAlreadySent(key);
      if (alreadySent) {
        summary.notificationsSkipped++;
        console.log(`${LOG_PREFIX} Skipping service reminder (already sent): ${key}`);
        continue;
      }

      let payload;
      try {
        payload = buildServiceReminderPayload({ booking, service, trigger, bookingId });
      } catch (err) {
        const msg = `Booking ${bookingId} svc${svcIdx}: buildServiceReminderPayload threw — ${err.message}`;
        console.error(`${LOG_PREFIX}`, msg);
        summary.errors.push(msg);
        continue;
      }

      console.log(`${LOG_PREFIX} Service reminder [${trigger}] → agent ${agentId} | ${payload.title}`);

      const sent = await sendNotif({ userId: agentId, payload, key });
      if (sent) {
        summary.notificationsSent++;
        await markSent(key, {
          bookingId,
          agentId,
          trigger,
          serviceType: service.type,
          serviceDescription: service.description || "",
        });
      } else {
        summary.notificationsFailed++;
        summary.errors.push(
          `Failed to send service reminder [${trigger}] for booking ${bookingId} svc${svcIdx}`
        );
      }
    }
  }

  // ── 4. Final log & response ───────────────────────────────────────────────
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

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}