// src/utils/copyPackageSummary.js
// Standalone clipboard-copy utility for WhatsApp package summaries.
// Usage: import { copyPackageSummary } from "@/utils/copyPackageSummary";

import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const MEAL_PLAN_LABELS = {
  EP:  "Accommodation only",
  CP:  "Bed + Breakfast",
  MAP: "Breakfast + Dinner",
  AP:  "All Meals",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const calculateTotalMeals = (entries) => {
  let totalBreakfasts = 0, totalLunches = 0, totalDinners = 0;
  entries.forEach(({ selectedMealPlan, nights }) => {
    const n = parseInt(nights, 10);
    if (isNaN(n)) return;
    if (selectedMealPlan === "CP")  { totalBreakfasts += n; }
    if (selectedMealPlan === "MAP") { totalBreakfasts += n; totalDinners += n; }
    if (selectedMealPlan === "AP")  { totalBreakfasts += n; totalLunches += n; totalDinners += n; }
  });
  return { totalBreakfasts, totalLunches, totalDinners };
};

// ─── Summary Builder ─────────────────────────────────────────────────────────
/**
 * Builds the plain-text WhatsApp summary string.
 *
 * @param {Object} params
 * @param {Array}       params.hotelEntries        - Saved hotel entries from Redux
 * @param {Object|null} params.selectedTransport   - Selected transport object from Redux
 * @param {Array}       params.selectedActivities  - Selected activities array from Redux
 * @param {number}      params.grandTotal          - Final grand total including markup
 * @param {Array}       params.hotels              - Full hotels list (for GoogleListingURL lookup)
 * @returns {string}
 */
export const buildPackageSummary = ({
  hotelEntries,
  selectedTransport,
  selectedActivities,
  grandTotal,
  hotels,
}) => {
  if (!hotelEntries.length) return "Hotel details not available.";

  const first = hotelEntries[0];
  let s = `Dear Guests,\n\nGreetings from Adwait Tours!!\n`;
  s += `Kindly find the best possible rates for your requirement starting ${formatDate(first.checkInDate)}\n`;
  s += `${first.numDouble     || 0} Couple\n`;
  s += `${first.numExtraAdult || 0} Extra Adult\n`;
  s += `${first.numExtraChild || 0} Extra Child\n`;
  if ((first.numCNB || 0) > 0)
    s += `${first.numCNB} Child With No Bed (CNB)\n`;
  s += `\n`;
  s += ` *HOTELS*\n`;

  hotelEntries.forEach((e, idx) => {
    const fullH = hotels.find((h) => h.name === e.hotel && h.city === e.city);
    s += `${idx + 1}. ${e.hotel.toUpperCase()} ${fullH?.GoogleListingURL || ""}\n`;
    s += ` ⇒ ${e.city}, ${e.state}\n`;
    s += ` ⇒ Rooms: ${e.numDouble || 0}`;
    if ((e.numExtraAdult || 0) > 0) s += ` | Extra Adult: ${e.numExtraAdult}`;
    if ((e.numExtraChild || 0) > 0) s += ` | Extra Child: ${e.numExtraChild}`;
    if ((e.numCNB        || 0) > 0) s += ` | CNB: ${e.numCNB}`;
    s += ` | Category: ${(e.selectedRoomCategory || "").toUpperCase()}\n`;
    s += ` ⇒ ${formatDate(e.checkInDate)} to ${formatDate(e.checkOutDate)} (${e.nights} Nights, ${MEAL_PLAN_LABELS[e.selectedMealPlan] || e.selectedMealPlan})\n\n`;
  });

  s += `*TOTAL TOUR COST = ₹${grandTotal.toLocaleString("en-IN")}/-*\n\n`;
  s += `*INCLUDED*\n`;

  const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(hotelEntries);
  if (totalBreakfasts > 0)  s += `✅ ${totalBreakfasts} Breakfast(s)\n`;
  if (totalLunches > 0)     s += `✅ ${totalLunches} Lunch(es)\n`;
  if (totalDinners > 0)     s += `✅ ${totalDinners} Dinner(s)\n`;
  if (!totalBreakfasts && !totalLunches && !totalDinners)
    s += `✅ No meals included (EP Plan)\n`;

  if (selectedTransport?.selectedVehicle) {
    const v = selectedTransport.selectedVehicle;
    s += `✅ ${v.type || v.name} ${v.ac ? "AC" : "Non-AC"} for all sightseeing and transfer\n`;
    s += `✅ Toll, Parking, Driver Allowance, Permits\n`;
  }

  selectedActivities?.forEach((act) => {
    s += `✅ ${act.name.toUpperCase()} (${act.city}) - ${act.participants} Person\n`;
  });

  s += `\n*EXCLUDED*\n`;
  s += `❌ Train / Flight Fare\n`;
  s += `❌ Early check in and late check out as per hotel policy\n`;
  s += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
  s += `❌ Anything not mentioned in included\n`;

  return s;
};

// ─── Copy to Clipboard ───────────────────────────────────────────────────────
/**
 * Builds the WhatsApp summary and copies it to the clipboard.
 * Shows a toast on success or failure.
 *
 * Accepts the same params as buildPackageSummary.
 */
export const copyPackageSummary = (params) => {
  const summary = buildPackageSummary(params);

  // Prefer the modern Clipboard API; fall back to execCommand for older browsers.
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(summary)
      .then(()  => toast("Package summary copied!"))
      .catch(()  => toast.error("Copy failed"));
    return;
  }

  // Fallback
  const ta = document.createElement("textarea");
  ta.value = summary;
  ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
  document.body.appendChild(ta);
  try {
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    if (ok) toast("Package summary copied!");
    else    toast.error("Copy failed.");
  } catch {
    toast.error("Copy error.");
  } finally {
    document.body.removeChild(ta);
  }
};