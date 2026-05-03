// lib/installmentChecker.test.js
import {
  toDate,
  toISTDateStr,
  getTrigger,
  dedupKey,
  buildNotifPayload,
  extractPendingInstallments,
  IST_OFFSET_MS,
} from "./installmentChecker";

function istTime(yyyy, mm, dd, hh = 0, min = 0) {
  const utc = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, 0, 0));
  return new Date(utc.getTime() - IST_OFFSET_MS);
}

// ─── toDate ───────────────────────────────────────────────────────────────────

describe("toDate", () => {
  it("handles Firestore Timestamp objects", () => {
    const ts = { toDate: () => new Date("2025-05-04T00:00:00Z") };
    expect(toDate(ts)).toEqual(new Date("2025-05-04T00:00:00Z"));
  });
  it("handles ISO strings", () => {
    expect(toDate("2025-05-04")).toBeInstanceOf(Date);
  });
  it("handles Date objects", () => {
    const d = new Date();
    expect(toDate(d)).toBe(d);
  });
  it("returns null for null", ()      => expect(toDate(null)).toBeNull());
  it("returns null for undefined", () => expect(toDate(undefined)).toBeNull());
  it("returns null for invalid strings", () => expect(toDate("not-a-date")).toBeNull());
});

// ─── toISTDateStr ─────────────────────────────────────────────────────────────

describe("toISTDateStr", () => {
  it("returns YYYY-MM-DD in IST for a UTC timestamp", () => {
    const utcMs = new Date("2025-05-03T23:00:00Z").getTime();
    expect(toISTDateStr(utcMs)).toBe("2025-05-04");
  });
  it("handles midnight UTC correctly", () => {
    const utcMs = new Date("2025-05-04T00:00:00Z").getTime();
    expect(toISTDateStr(utcMs)).toBe("2025-05-04");
  });
  it("handles 18:30 UTC = midnight IST (next day boundary)", () => {
    const utcMs = new Date("2025-05-04T18:30:00Z").getTime();
    expect(toISTDateStr(utcMs)).toBe("2025-05-05");
  });
});

// ─── getTrigger ───────────────────────────────────────────────────────────────

describe("getTrigger — day_before", () => {
  it("returns day_before when due date is IST-tomorrow", () => {
    const now     = istTime(2025, 5, 3, 10, 0);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("day_before");
  });
  it("returns day_before at 23:59 IST with due next day", () => {
    const now     = istTime(2025, 5, 3, 23, 59);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("day_before");
  });
});

describe("getTrigger — due_today (no hour restriction)", () => {
  it("returns due_today at 02:30 IST on the due date (cron window)", () => {
    // KEY FIX: this previously returned null because of the 8am gate
    const now     = istTime(2025, 5, 4, 2, 30);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("due_today");
  });
  it("returns due_today at 08:00 IST on the due date", () => {
    const now     = istTime(2025, 5, 4, 8, 0);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("due_today");
  });
  it("returns due_today at 21:00 IST on the due date", () => {
    const now     = istTime(2025, 5, 4, 21, 0);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("due_today");
  });
  it("returns due_today at midnight IST (00:00) on due date", () => {
    const now     = istTime(2025, 5, 4, 0, 0);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("due_today");
  });
});

describe("getTrigger — overdue", () => {
  it("returns overdue for yesterday's unpaid installment", () => {
    const now     = istTime(2025, 5, 5, 10, 0);
    const dueDate = istTime(2025, 5, 4, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("overdue");
  });
  it("returns overdue for a week-old unpaid installment", () => {
    const now     = istTime(2025, 5, 10, 10, 0);
    const dueDate = istTime(2025, 5, 3, 0, 0);
    expect(getTrigger(dueDate, now)).toBe("overdue");
  });
});

describe("getTrigger — no trigger", () => {
  it("returns null for due dates 2+ days in the future", () => {
    const now     = istTime(2025, 5, 3, 10, 0);
    const dueDate = istTime(2025, 5, 5, 0, 0);
    expect(getTrigger(dueDate, now)).toBeNull();
  });
  it("returns null for null dueDate",    () => expect(getTrigger(null, new Date())).toBeNull());
  it("returns null for invalid dueDate", () => expect(getTrigger(new Date("invalid"), new Date())).toBeNull());
});

// ─── dedupKey ─────────────────────────────────────────────────────────────────

describe("dedupKey", () => {
  it("includes all expected parts", () => {
    const now = istTime(2025, 5, 3, 10, 0);
    const key = dedupKey("booking123", 0, "pay1", "day_before", now);
    expect(key).toContain("booking123");
    expect(key).toContain("svc0");
    expect(key).toContain("pay1");
    expect(key).toContain("day_before");
    expect(key).toContain("2025-05-03");
  });
  it("produces different keys for different triggers", () => {
    const now = istTime(2025, 5, 4, 10, 0);
    expect(dedupKey("b1", 0, "p0", "day_before", now))
      .not.toBe(dedupKey("b1", 0, "p0", "due_today", now));
  });
  it("produces different keys for overdue on different days", () => {
    const d1 = istTime(2025, 5, 5, 10, 0);
    const d2 = istTime(2025, 5, 6, 10, 0);
    expect(dedupKey("b1", 0, "p0", "overdue", d1))
      .not.toBe(dedupKey("b1", 0, "p0", "overdue", d2));
  });
  it("is idempotent for same inputs", () => {
    const now = istTime(2025, 5, 3, 10, 0);
    expect(dedupKey("b1", 1, "pay2", "overdue", now))
      .toBe(dedupKey("b1", 1, "pay2", "overdue", now));
  });
});

// ─── extractPendingInstallments ───────────────────────────────────────────────

describe("extractPendingInstallments", () => {
  const mockBooking = {
    agentId: "agent1",
    customerName: "Rahul Sharma",
    services: [
      {
        type: "Hotel",
        description: "Taj Mahal Palace",
        amount: "50000",
        vendorPayments: [
          { status: "Paid",    amount: "20000", date: "2025-04-01" },
          { status: "Pending", amount: "30000", date: "2025-05-10" },
        ],
      },
      {
        type: "Flight",
        description: "Air India DEL-BOM",
        amount: "15000",
        vendorPayments: [
          { status: "Pending", amount: "15000", date: "2025-05-12" },
        ],
      },
    ],
  };

  it("extracts only pending payments with valid dates", () => {
    const result = extractPendingInstallments("bk1", mockBooking);
    expect(result).toHaveLength(2);
  });
  it("skips paid payments", () => {
    const result = extractPendingInstallments("bk1", mockBooking);
    expect(result.map(r => r.payment.amount)).not.toContain("20000");
  });
  it("includes serviceIdx correctly", () => {
    const result = extractPendingInstallments("bk1", mockBooking);
    expect(result[0].serviceIdx).toBe(0);
    expect(result[1].serviceIdx).toBe(1);
  });
  it("includes bookingId in each result", () => {
    extractPendingInstallments("bk1", mockBooking).forEach(r =>
      expect(r.bookingId).toBe("bk1")
    );
  });
  it("skips payments with no date", () => {
    const b = { agentId: "a1", services: [{ type: "Hotel",
      vendorPayments: [{ status: "Pending", amount: "5000" }] }] };
    expect(extractPendingInstallments("bk2", b)).toHaveLength(0);
  });
  it("skips payments with invalid date strings", () => {
    const b = { agentId: "a1", services: [{ type: "Hotel",
      vendorPayments: [{ status: "Pending", amount: "5000", date: "not-a-date" }] }] };
    expect(extractPendingInstallments("bk2", b)).toHaveLength(0);
  });
  it("returns empty when services missing",        () => expect(extractPendingInstallments("bk3", { agentId: "a1" })).toHaveLength(0));
  it("returns empty when vendorPayments missing",  () => {
    const b = { agentId: "a1", services: [{ type: "Hotel", amount: "10000" }] };
    expect(extractPendingInstallments("bk4", b)).toHaveLength(0);
  });
});

// ─── buildNotifPayload ────────────────────────────────────────────────────────

describe("buildNotifPayload", () => {
  const base = {
    booking:   { customerName: "Priya Nair" },
    service:   { type: "Hotel", description: "Grand Hyatt" },
    payment:   { amount: "25000", date: "2025-05-04" },
    bookingId: "bk42",
  };

  it("day_before payload is correct", () => {
    const p = buildNotifPayload({ ...base, trigger: "day_before" });
    expect(p.title).toContain("Tomorrow");
    expect(p.message).toContain("₹25,000");
    expect(p.message).toContain("Grand Hyatt");
    expect(p.priority).toBe("high");
    expect(p.type).toBe("vendor_payment_due");
    expect(p.link).toBe("/agent-panel/bookings/bk42");
  });
  it("due_today payload is correct", () => {
    const p = buildNotifPayload({ ...base, trigger: "due_today" });
    expect(p.title).toContain("Today");
    expect(p.message).toContain("today");
  });
  it("overdue payload is correct", () => {
    const p = buildNotifPayload({ ...base, trigger: "overdue" });
    expect(p.title).toContain("Overdue");
    expect(p.message).toContain("still unpaid");
  });
  it("falls back to service.type when description missing", () => {
    const p = buildNotifPayload({ ...base, service: { type: "Flight" }, trigger: "overdue" });
    expect(p.title).toContain("Flight");
  });
  it("handles zero amount", () => {
    const p = buildNotifPayload({ ...base, payment: { amount: "0", date: "2025-05-04" }, trigger: "overdue" });
    expect(p.message).toContain("₹0");
  });
});