"use client";
// hooks/useInstallmentAlerts.js
//
// Runs ONCE on mount (client-side only) for the logged-in agent.
// Purpose: catch any due_today / overdue installment notifications that the
// nightly cron may have missed — e.g. a payment added after the cron ran,
// or the cron's due_today window that happened before the agent opened the app.
//
// Uses the SAME dedup store (installmentNotifSent) and SAME createNotification()
// as the cron, so notifications are never doubled regardless of which path fires first.
//
// Called from: your top-level layout or the useNotifications hook.

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
} from "@/lib/installmentChecker";

const LOG = "[useInstallmentAlerts]";

// Re-check at most once every 30 minutes within the same browser session.
// Prevents hammering Firestore if the agent switches tabs frequently.
const RECHECK_INTERVAL_MS = 30 * 60 * 1000;

// Module-level timestamp so the throttle survives hook remounts
// (e.g. React Strict Mode double-invoke in dev).
let _lastCheckAt = 0;

// ─── Dedup helpers (client-side mirror of the cron's helpers) ─────────────────

async function isAlreadySent(key) {
  try {
    const snap = await getDoc(doc(db, "installmentNotifSent", key));
    return snap.exists();
  } catch (err) {
    // On read error be conservative — skip to avoid spam
    console.warn(`${LOG} isAlreadySent read failed for "${key}":`, err.message);
    return true;
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

// ─── Main checker (extracted so it can be called manually too) ────────────────

export async function checkInstallmentAlerts(userId) {
  if (!userId) return;

  const nowUtc = new Date();
  console.log(`${LOG} Checking at ${nowUtc.toISOString()} for agent ${userId}`);

  // Load only active bookings for this agent
  let bookings = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "bookings"),
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
    let installments;
    try {
      installments = extractPendingInstallments(booking.id, booking);
    } catch (err) {
      console.error(`${LOG} extractPendingInstallments failed for ${booking.id}:`, err.message);
      continue;
    }

    for (const inst of installments) {
      const { service, serviceIdx, payment, paymentKey, bookingId } = inst;
      const dueDate = payment._resolvedDate;

      const trigger = getTrigger(dueDate, nowUtc);

      // Client-side only fires due_today and overdue.
      // day_before is not time-critical enough to need the client fallback.
      if (trigger !== "due_today" && trigger !== "overdue") continue;

      const key = dedupKey(bookingId, serviceIdx, paymentKey, trigger, nowUtc);

      const alreadySent = await isAlreadySent(key);
      if (alreadySent) {
        skipped++;
        continue;
      }

      // Build and send
      let payload;
      try {
        payload = buildNotifPayload({ booking, service, payment, trigger, bookingId });
      } catch (err) {
        console.error(`${LOG} buildNotifPayload failed:`, err.message);
        continue;
      }

      console.log(`${LOG} Firing [${trigger}] → ${payload.title}`);

      try {
        await createNotification({
          userId,
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

        await markSent(key, {
          bookingId,
          agentId:  userId,
          trigger,
        });

        fired++;
      } catch (err) {
        console.error(`${LOG} createNotification failed for key "${key}":`, err.message);
      }
    }
  }

  console.log(`${LOG} Done — fired: ${fired}, skipped (dedup): ${skipped}`);
  _lastCheckAt = Date.now();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInstallmentAlerts(userId) {
  const runningRef = useRef(false); // prevent concurrent runs

  useEffect(() => {
    if (!userId) return;
    if (typeof window === "undefined") return; // SSR guard

    const now = Date.now();
    if (now - _lastCheckAt < RECHECK_INTERVAL_MS) {
      console.log(`${LOG} Skipping — last check was ${Math.round((now - _lastCheckAt) / 60000)}m ago`);
      return;
    }

    if (runningRef.current) return;
    runningRef.current = true;

    checkInstallmentAlerts(userId).finally(() => {
      runningRef.current = false;
    });
  }, [userId]);
}