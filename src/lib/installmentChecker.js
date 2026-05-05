// lib/installmentChecker.js
// Pure logic for determining which installment notifications to fire.
// No Firestore or fetch calls here — fully unit-testable.

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Convert any date-like value to a JS Date.
 * Handles Firestore Timestamps, ISO strings, and Date objects.
 */
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate(); // Firestore Timestamp
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Return the IST calendar date as a plain "YYYY-MM-DD" string for a given UTC timestamp.
 * Used to key deduplication records.
 */
export function toISTDateStr(utcMs) {
  const istMs = utcMs + IST_OFFSET_MS;
  const d = new Date(istMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Given a payment due date, return the IST midnight (00:00:00 IST) of that day
 * expressed as a UTC Date. Used to compare "is today the due date".
 */
export function istMidnight(dueDateUtc) {
  const istMs = dueDateUtc.getTime() + IST_OFFSET_MS;
  const d = new Date(istMs);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - IST_OFFSET_MS);
}

/**
 * Determine which trigger (if any) applies to a pending installment right now.
 *
 * Trigger types:
 *   "day_before"  — due date is tomorrow (IST)
 *   "due_today"   — due date is today (IST) — fires ANY time during the day
 *   "overdue"     — due date was in the past (IST) and payment is still pending
 *
 * The old 8am IST gate on due_today has been removed. The client-side hook
 * (useInstallmentAlerts) provides the "at least once on the day" guarantee
 * regardless of when the cron ran, so no time-of-day restriction is needed here.
 *
 * @param {Date}   dueDate    - The payment due date
 * @param {Date}   nowUtc     - Current time in UTC (injected for testability)
 * @returns {"day_before"|"due_today"|"overdue"|null}
 */
export function getTrigger(dueDate, nowUtc) {
  if (!dueDate || !(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
    return null;
  }

  const nowIstMs = nowUtc.getTime() + IST_OFFSET_MS;
  const dueIstMs = dueDate.getTime() + IST_OFFSET_MS;

  // Truncate both to IST calendar dates for day-level comparison
  const nowIstDay = new Date(nowIstMs);
  nowIstDay.setUTCHours(0, 0, 0, 0);

  const dueIstDay = new Date(dueIstMs);
  dueIstDay.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dueIstDay.getTime() - nowIstDay.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays === 1) return "day_before";

  if (diffDays === 0) {
    // Fire due_today any time on the due date — no hour restriction.
    // The client-side hook handles missed cron windows.
    return "due_today";
  }

  if (diffDays < 0) return "overdue";

  return null;
}

/**
 * Build the deduplication key for a given installment + trigger + IST date.
 * Format: "bookingId__serviceIdx__paymentKey__trigger__YYYY-MM-DD"
 * The trailing date ensures overdue fires once per day, not once ever.
 */
export function dedupKey(bookingId, serviceIdx, paymentKey, trigger, nowUtc) {
  const dateStr = toISTDateStr(nowUtc.getTime());
  return `${bookingId}__svc${serviceIdx}__${paymentKey}__${trigger}__${dateStr}`;
}

/**
 * Build the human-readable notification payload for a trigger.
 */
export function buildNotifPayload({ booking, service, payment, trigger, bookingId }) {
  const svcName  = service.description || service.type || "Service";
  const customer = booking.customerName || "Customer";
  const amt      = Number(payment.amount) || 0;
  const amtStr   = `₹${amt.toLocaleString("en-IN")}`;
  const dueDate  = toDate(payment.date);
  const dateLabel = dueDate
    ? dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "unknown date";

  const triggerMeta = {
    day_before: {
      title: `⏰ Payment Due Tomorrow — ${svcName}`,
      message: `${amtStr} vendor payment for "${svcName}" (${customer}) is due tomorrow on ${dateLabel}.`,
      priority: "high",
    },
    due_today: {
      title: `🔔 Payment Due Today — ${svcName}`,
      message: `${amtStr} vendor payment for "${svcName}" (${customer}) is due today (${dateLabel}). Please process it now.`,
      priority: "high",
    },
    overdue: {
      title: `🚨 Overdue Vendor Payment — ${svcName}`,
      message: `${amtStr} vendor payment for "${svcName}" (${customer}) was due on ${dateLabel} and is still unpaid.`,
      priority: "high",
    },
  };

  const meta = triggerMeta[trigger];
  return {
    type: "vendor_payment_due",
    link: `/agent-panel/bookings/${bookingId}`,
    ...meta,
  };
}

/**
 * Extract all pending installments from a single booking document.
 * Returns a flat array of { bookingId, agentId, service, serviceIdx, payment, paymentKey }.
 */
export function extractPendingInstallments(bookingId, booking) {
  const results = [];
  const services = Array.isArray(booking.services) ? booking.services : [];

  services.forEach((service, serviceIdx) => {
    const vendorPayments = Array.isArray(service.vendorPayments)
      ? service.vendorPayments
      : [];

    vendorPayments.forEach((payment, paymentIdx) => {
      if (payment.status !== "Pending") return;
      if (!payment.date) return;

      const dueDate = toDate(payment.date);
      if (!dueDate) return;

      const paymentKey = `pay${paymentIdx}`;

      results.push({
        bookingId,
        agentId: booking.agentId,
        service,
        serviceIdx,
        payment: { ...payment, _resolvedDate: dueDate },
        paymentKey,
      });
    });
  });

  return results;
}