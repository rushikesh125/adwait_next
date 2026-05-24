"use client";
// hooks/useInstallmentAlerts.js
//
// Runs ONCE on mount (client-side only) for the logged-in agent.
// Purpose: catch any due_today / overdue installment notifications that the
// nightly cron may have missed — e.g. a payment added after the cron ran,
// or the cron's due_today window that happened before the agent opened the app.
//
// Also fires service-pending reminders for 1d and 0d before trip startDate
// as an urgent client-side fallback (cron handles 7d and 2d).
//
// Uses the SAME dedup store (installmentNotifSent) and SAME createNotification()
// as the cron, so notifications are never doubled regardless of which path fires first.

import { useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { createNotification } from "@/firebase/notificationsService";
import {
  getTrigger,
  dedupKey,
  buildNotifPayload,
  extractPendingInstallments,
  toISTDateStr,
  getServiceTrigger,
  serviceReminderDedupKey,
  buildServiceReminderPayload,
} from "@/lib/installmentChecker";

const LOG = "[useInstallmentAlerts]";

// Re-check at most once every 30 minutes within the same browser session.
const RECHECK_INTERVAL_MS = 30 * 60 * 1000;

// Module-level so throttle survives hook remounts (React Strict Mode, tab switches)
let _lastCheckAt = 0;

// ─── Dedup helpers ────────────────────────────────────────────────────────────

async function isAlreadySent(key) {
  try {
    const snap = await getDoc(doc(db, "installmentNotifSent", key));
    return snap.exists();
  } catch (err) {
    console.warn(`${LOG} isAlreadySent read failed for "${key}":`, err.message);
    return true; // conservative — skip on error to avoid spam
  }
}

async function markSent(key, metadata = {}) {
  try {
    await setDoc(
      doc(db, "installmentNotifSent", key),
      { sentAt: serverTimestamp(), source: "client/useInstallmentAlerts", ...metadata },
      { merge: true }
    );
  } catch (err) {
    console.warn(`${LOG} markSent failed for "${key}":`, err.message);
  }
}

// ─── Main checker ─────────────────────────────────────────────────────────────

export async function checkInstallmentAlerts(userId, orgId = null) {
  if (!userId || !orgId) return;

  const nowUtc = new Date();
  console.log(`${LOG} Checking at ${nowUtc.toISOString()} for agent ${userId}`);

  // Load only active bookings for this agent
  let bookings = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "bookings"),
        where("orgId", "==", orgId),
        where("agentId", "==", userId),
        where("status", "not-in", ["Cancelled", "Completed"])
      )
    );
    bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`${LOG} Failed to load bookings:`, err.message);
    return;
  }

  if (bookings.length === 0) return;

  let fired = 0;
  let skipped = 0;

  for (const booking of bookings) {
    // ── A. Vendor payment installments ──────────────────────────────────────
    let installments;
    try {
      installments = extractPendingInstallments(booking.id, booking);
    } catch (err) {
      console.error(`${LOG} extractPendingInstallments failed for ${booking.id}:`, err.message);
      installments = [];
    }

    for (const inst of installments) {
      const { service, serviceIdx, payment, paymentKey, bookingId } = inst;
      const dueDate = payment._resolvedDate;

      const trigger = getTrigger(dueDate, nowUtc);

      // Client only fires urgent triggers — cron handles the rest
      if (trigger !== "due_today" && trigger !== "overdue") continue;

      const key = dedupKey(bookingId, serviceIdx, paymentKey, trigger, nowUtc);

      const alreadySent = await isAlreadySent(key);
      if (alreadySent) {
        skipped++;
        continue;
      }

      let payload;
      try {
        payload = buildNotifPayload({ booking, service, payment, trigger, bookingId });
      } catch (err) {
        console.error(`${LOG} buildNotifPayload failed:`, err.message);
        continue;
      }

      console.log(`${LOG} Installment [${trigger}] → ${payload.title}`);

      try {
        await createNotification({
          userId,
          orgId,
          type:     payload.type,
          title:    payload.title,
          message:  payload.message,
          link:     payload.link,
          priority: payload.priority,
          metadata: {
            dedupKey:           key,
            source:             "client/useInstallmentAlerts",
            bookingId,
            serviceType:        service.type,
            serviceDescription: service.description || "",
            amount:             payment.amount,
            dueDate:            payment.date,
          },
        });
        await markSent(key, { bookingId, agentId: userId, orgId, trigger });
        fired++;
      } catch (err) {
        console.error(`${LOG} createNotification failed for key "${key}":`, err.message);
      }
    }

    // ── B. Pending service reminders (client fires 1d and 0d only) ──────────
    const startDate = booking.startDate;
    if (!startDate) continue;

    const services = booking.services || [];

    for (let svcIdx = 0; svcIdx < services.length; svcIdx++) {
      const service = services[svcIdx];
      if (service.status !== "Pending") continue;

      const trigger = getServiceTrigger(startDate, nowUtc);

      // Client-side only handles urgent reminders — cron covers 7d and 2d
      if (trigger !== "service_1d" && trigger !== "service_0d") continue;

      const key = serviceReminderDedupKey(booking.id, svcIdx, trigger, nowUtc);

      const alreadySent = await isAlreadySent(key);
      if (alreadySent) {
        skipped++;
        continue;
      }

      let payload;
      try {
        payload = buildServiceReminderPayload({
          booking,
          service,
          trigger,
          bookingId: booking.id,
        });
      } catch (err) {
        console.error(`${LOG} buildServiceReminderPayload failed:`, err.message);
        continue;
      }

      console.log(`${LOG} Service reminder [${trigger}] → ${payload.title}`);

      try {
        await createNotification({
          userId,
          orgId,
          type:     payload.type,
          title:    payload.title,
          message:  payload.message,
          link:     payload.link,
          priority: payload.priority,
          metadata: {
            dedupKey:    key,
            source:      "client/useInstallmentAlerts",
            bookingId:   booking.id,
            serviceType: service.type,
            serviceDescription: service.description || "",
          },
        });
        await markSent(key, { bookingId: booking.id, agentId: userId, orgId, trigger });
        fired++;
      } catch (err) {
        console.error(`${LOG} Service reminder createNotification failed for key "${key}":`, err.message);
      }
    }
  }

  console.log(`${LOG} Done — fired: ${fired}, skipped (dedup): ${skipped}`);
  _lastCheckAt = Date.now();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInstallmentAlerts(userId, orgId = null) {
  const runningRef = useRef(false); // prevent concurrent runs

  useEffect(() => {
    if (!userId || !orgId) return;
    if (typeof window === "undefined") return; // SSR guard

    const now = Date.now();
    if (now - _lastCheckAt < RECHECK_INTERVAL_MS) {
      console.log(`${LOG} Skipping — last check was ${Math.round((now - _lastCheckAt) / 60000)}m ago`);
      return;
    }

    if (runningRef.current) return;
    runningRef.current = true;

    checkInstallmentAlerts(userId, orgId).finally(() => {
      runningRef.current = false;
    });
  }, [userId, orgId]);
}
// Add this export
export function resetInstallmentAlertThrottle() {
  _lastCheckAt = 0;
}
