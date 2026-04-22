// src/utils/copyPackageSummary.js
// Updated with multi-option package support

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

// ─── Per-option grand total calculator ───────────────────────────────────────
/**
 * Calculates the grand total for one option, applying markup correctly.
 * If markup was applied as a percentage it was already resolved to a rupee
 * amount in confirmedMarkup, so we just add it. But if the caller passes the
 * raw markupAmount + markupType we can recompute per-option. For simplicity
 * (matching the existing Redux flow) we accept the already-resolved
 * confirmedMarkup as a lump-sum and add it directly.
 */
const calcOptionGrandTotal = (opt, transportTotal, activityTotal, confirmedMarkup) => {
  const hotelTotal = (opt.hotelEntries || []).reduce(
    (s, e) => s + Number(e.hotelTotal || 0),
    0,
  );
  return hotelTotal + transportTotal + activityTotal + confirmedMarkup;
};

// ─── Per-option block builder ─────────────────────────────────────────────────
/**
 * Builds one option block.
 * @param {Object}  option
 * @param {number}  index
 * @param {Array}   hotels            - full hotel list for URL lookup
 * @param {number}  transportTotal
 * @param {number}  activityTotal
 * @param {number}  confirmedMarkup
 * @param {boolean} isMultiOption     - when false, suppress the option header
 */
const buildOptionBlock = (
  option,
  index,
  hotels = [],
  transportTotal = 0,
  activityTotal = 0,
  confirmedMarkup = 0,
  isMultiOption = true,
) => {
  const hotelEntries = option.hotelEntries || [];
  if (hotelEntries.length === 0) {
    return isMultiOption ? `*${option.name}*\nNo hotels added.\n` : `No hotels added.\n`;
  }

  const grandTotal = calcOptionGrandTotal(option, transportTotal, activityTotal, confirmedMarkup);

  let s = "";

  if (isMultiOption) {
    s += `*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    s += `*📦 ${option.name.toUpperCase()}*\n`;
    s += `*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
  }

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

  // Grand total at bottom of each option block (no individual cost breakdown)
  s += `*💰 Total Tour Cost: ₹${grandTotal.toLocaleString("en-IN")}/-*\n`;

  return s;
};

// ─── Summary Builder ─────────────────────────────────────────────────────────
export const buildPackageSummary = ({
  // New multi-option API
  packageOptions,
  selectedTransport,
  selectedActivities,
  transportTotalPrice = 0,
  activityTotalPrice = 0,
  confirmedMarkup = 0,
  hotels = [],
  // Legacy single-option compat
  hotelEntries: legacyHotelEntries,
  grandTotal: legacyGrandTotal,
}) => {
  // Normalise to always use options array
  const options = packageOptions?.length
    ? packageOptions
    : legacyHotelEntries?.length
    ? [{ id: 1, name: "Package", hotelEntries: legacyHotelEntries }]
    : [];

  if (!options.length) return "Hotel details not available.";

  const isMultiOption = options.length > 1;

  // Use first option's first entry for guest/date header
  const firstEntry = options[0]?.hotelEntries?.[0] || {};

  let s = `Dear Guests,\n\nGreetings from Adwait Tours!!\n`;
  s += `Kindly find the best possible rates for your requirement starting ${formatDate(firstEntry.checkInDate)}\n`;
  s += `${firstEntry.numDouble     || 0} Couple\n`;
  s += `${firstEntry.numExtraAdult || 0} Extra Adult\n`;
  s += `${firstEntry.numExtraChild || 0} Extra Child\n`;
  if ((firstEntry.numCNB || 0) > 0) s += `${firstEntry.numCNB} Child With No Bed (CNB)\n`;
  s += `\n`;

  if (isMultiOption) {
    s += `📋 *${options.length} Package Options Available — Choose Your Preference*\n\n`;
  }

  // Build each option block (grand total embedded, no individual cost lines)
  for (let i = 0; i < options.length; i++) {
    s += buildOptionBlock(
      options[i],
      i,
      hotels,
      transportTotalPrice,
      activityTotalPrice,
      confirmedMarkup,
      isMultiOption,
    );
    s += `\n`;
  }

  // Inclusions
  s += `*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
  s += `*INCLUDED*\n`;
  s += `*━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*\n`;

  s += `✅ Accommodation as per package selection\n`;

  const allHotelEntries = options.flatMap((o) => o.hotelEntries || []);
  const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(allHotelEntries);
  if (totalBreakfasts > 0) s += `✅ ${totalBreakfasts} Breakfast(s)\n`;
  if (totalLunches > 0)    s += `✅ ${totalLunches} Lunch(es)\n`;
  if (totalDinners > 0)    s += `✅ ${totalDinners} Dinner(s)\n`;
  if (!totalBreakfasts && !totalLunches && !totalDinners) s += `✅ No meals included (EP Plan)\n`;

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
export const copyPackageSummary = (params) => {
  const summary = buildPackageSummary(params);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(summary)
      .then(() => toast("Package summary copied!"))
      .catch(() => toast.error("Copy failed"));
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

// ─── WhatsApp Share ───────────────────────────────────────────────────────────
const normalizeWhatsAppNumber = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
};

export const sharePackageSummaryOnWhatsApp = (params, guestPhone = "") => {
  const summary = buildPackageSummary(params);
  const phone = normalizeWhatsAppNumber(guestPhone);
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(summary)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`;

  window.open(url, "_blank", "noopener,noreferrer");

  if (!phone) {
    toast("Opening WhatsApp. Select the guest manually.");
  }
};