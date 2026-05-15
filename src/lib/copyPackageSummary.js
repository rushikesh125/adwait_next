// src/lib/copyPackageSummary.js
// Updated: per-option markup support + transport/activity shown without price

import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const MEAL_PLAN_LABELS = {
  EP: "Accommodation only",
  CP: "Bed + Breakfast",
  MAP: "Breakfast + Dinner",
  AP: "All Meals",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const calculateTotalMeals = (entries) => {
  let totalBreakfasts = 0,
    totalLunches = 0,
    totalDinners = 0;
  entries.forEach(({ selectedMealPlan, nights }) => {
    const n = parseInt(nights, 10);
    if (isNaN(n)) return;
    if (selectedMealPlan === "CP") {
      totalBreakfasts += n;
    }
    if (selectedMealPlan === "MAP") {
      totalBreakfasts += n;
      totalDinners += n;
    }
    if (selectedMealPlan === "AP") {
      totalBreakfasts += n;
      totalLunches += n;
      totalDinners += n;
    }
  });
  return { totalBreakfasts, totalLunches, totalDinners };
};

// ─── Shared helper: resolve per-option markup ─────────────────────────────────
/**
 * If the option has a pre-stored `.markup` (set by the component), use it.
 * Otherwise fall back: percentage → recompute for this option's base,
 * lumpsum → use confirmedMarkup directly.
 */
export const resolveOptionMarkup = (
  opt,
  transportTotal,
  activityTotal,
  confirmedMarkup,
  markupType = "lumpsum",
  markupAmount = 0,
) => {
  // Pre-stored per-option markup takes priority (set when user clicks Apply)
  if (typeof opt.markup === "number") return opt.markup;

  // Fallback: recompute from raw inputs if percentage
  if (markupType === "percentage" && markupAmount > 0) {
    const hotelTotal = (opt.hotelEntries || []).reduce(
      (s, e) => s + Number(e.hotelTotal || 0),
      0,
    );
    const base = hotelTotal + transportTotal + activityTotal;
    return (markupAmount / 100) * base;
  }

  // Lumpsum: same for all options
  return confirmedMarkup;
};

/**
 * Calculates the per-option grand total.
 * optionMarkup is already resolved to a ₹ amount for THIS option.
 */
const calcOptionGrandTotal = (
  opt,
  transportTotal,
  activityTotal,
  optionMarkup,
) => {
  const hotelTotal = (opt.hotelEntries || []).reduce(
    (s, e) => s + Number(e.hotelTotal || 0),
    0,
  );
  return hotelTotal + transportTotal + activityTotal + optionMarkup;
};

// ─── Per-option block builder ─────────────────────────────────────────────────
const buildOptionBlock = (
  option,
  hotels = [],
  transportTotal = 0,
  activityTotal = 0,
  optionMarkup = 0,
  isMultiOption = true,
  appliedDiscount = null,
) => {
  const hotelEntries = option.hotelEntries || [];
  if (hotelEntries.length === 0) {
    return isMultiOption
      ? `*${option.name}*\nNo hotels added.\n`
      : `No hotels added.\n`;
  }

  const grandTotal = calcOptionGrandTotal(
    option,
    transportTotal,
    activityTotal,
    optionMarkup,
  );

  let s = "";

  if (isMultiOption) {
    s += `*━━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    s += `*📦 ${option.name.toUpperCase()}*\n`;
    s += `*━━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
  }

  s += ` *HOTELS*\n`;

  hotelEntries.forEach((e, idx) => {
    const fullH = hotels.find((h) => h.name === e.hotel && h.city === e.city);
    const link =
      fullH?.GoogleListingURL ||
      e.GoogleListingURL ||
      e.googleLink ||
      e.tripAdvisorLink ||
      e.TripAdvisorURL;

    s += `${idx + 1}. ${e.hotel.toUpperCase()}\n`;

    if (link) {
      s += ` 🔗 View Hotel: ${link}\n`;
    }
    s += ` ⇒ ${e.city}, ${e.state}\n`;
    s += ` ⇒ Rooms: ${e.numDouble || 0}`;
    if ((e.numExtraAdult || 0) > 0) s += ` | Extra Adult: ${e.numExtraAdult}`;
    if ((e.numExtraChild || 0) > 0) s += ` | Extra Child: ${e.numExtraChild}`;
    if ((e.numCNB || 0) > 0) s += ` | CNB: ${e.numCNB}`;
    s += ` | Category: ${(e.selectedRoomCategory || "").toUpperCase()}\n`;
    s += ` ⇒ ${formatDate(e.checkInDate)} to ${formatDate(e.checkOutDate)} (${e.nights} Nights, ${MEAL_PLAN_LABELS[e.selectedMealPlan] || e.selectedMealPlan})\n\n`;
  });

  // Grand total per option — no individual cost breakdown shown
  const preDiscountTotal = calcOptionGrandTotal(
    option,
    transportTotal,
    activityTotal,
    optionMarkup,
  );
  const discountAmount = (() => {
    if (!appliedDiscount?.value || appliedDiscount.value <= 0) return 0;
    if (appliedDiscount.type === "percentage") {
      return Math.round((appliedDiscount.value / 100) * preDiscountTotal);
    }
    return Math.min(Number(appliedDiscount.value), preDiscountTotal);
  })();
  const finalTotal = preDiscountTotal - discountAmount;

  if (discountAmount > 0) {
    s += `Package Cost: ₹${preDiscountTotal.toLocaleString("en-IN")}/-\n`;
    s += `Special Discount${appliedDiscount.notes ? ` (${appliedDiscount.notes})` : ""}: −₹${discountAmount.toLocaleString("en-IN")}/-\n`;
    s += `*Final Package Cost: ₹${finalTotal.toLocaleString("en-IN")}/-*\n`;
  } else {
    s += `*TOTAL TOUR COST: ₹${preDiscountTotal.toLocaleString("en-IN")}/-*\n`;
  }
  return s;
};

// ─── Summary Builder
export const buildPackageSummary = ({
  packageOptions,
  selectedTransport,
  selectedActivities,
  transportTotalPrice = 0,
  activityTotalPrice = 0,
  confirmedMarkup = 0,
  markupType = "lumpsum",
  markupAmount = 0,
  hotels = [],
  appliedDiscount = null,
  hotelEntries: legacyHotelEntries,
}) => {
  const options = packageOptions?.length
    ? packageOptions
    : legacyHotelEntries?.length
      ? [{ id: 1, name: "Package", hotelEntries: legacyHotelEntries }]
      : [];

  if (!options.length) return "Hotel details not available.";

  const isMultiOption = options.length > 1;
  const firstEntry = options[0]?.hotelEntries?.[0] || {};

  let s = `Dear Guests,\n\nGreetings from Adwait Tours!!\n`;
  s += `Kindly find the best possible rates for your requirement starting ${formatDate(firstEntry.checkInDate)}\n`;
  s += `${firstEntry.numDouble || 0} Couple\n`;
  s += `${firstEntry.numExtraAdult || 0} Extra Adult\n`;
  s += `${firstEntry.numExtraChild || 0} Extra Child\n`;
  if ((firstEntry.numCNB || 0) > 0)
    s += `${firstEntry.numCNB} Child With No Bed (CNB)\n`;
  s += `\n`;

  if (isMultiOption) {
    s += `📋 *${options.length} Package Options Available — Choose Your Preference*\n\n`;
  }

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const optionMarkup = resolveOptionMarkup(
      opt,
      transportTotalPrice,
      activityTotalPrice,
      confirmedMarkup,
      markupType,
      markupAmount,
    );
    s += buildOptionBlock(
      opt,
      hotels,
      transportTotalPrice,
      activityTotalPrice,
      optionMarkup,
      isMultiOption,
      appliedDiscount,
    );
    s += `\n`;
  }
  s += `*━━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
  // Inclusions
  s += `*INCLUDED*\n`;
  if (isMultiOption) {
    s += `✅ Accommodation as per package selection\n`;
    s += `✅ Meal Plan as per package selection\n`;
  } else {
    s += `✅ Accommodation as per mentioned above\n`;
  }

  const allHotelEntries = options.flatMap((o) => o.hotelEntries || []);
  const { totalBreakfasts, totalLunches, totalDinners } =
    calculateTotalMeals(allHotelEntries);
  if (!isMultiOption) {
    if (totalBreakfasts > 0) s += `✅ ${totalBreakfasts} Breakfast(s)\n`;
    if (totalLunches > 0) s += `✅ ${totalLunches} Lunch(es)\n`;
    if (totalDinners > 0) s += `✅ ${totalDinners} Dinner(s)\n`;
  }
  // if (!totalBreakfasts && !totalLunches && !totalDinners)
  //   s += `✅ No meals included (EP Plan)\n`;

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

// Saved quotation -> package summary payload
export const buildQuotationSummaryPayload = (quotation = {}, hotels = []) => {
  const packageOptions =
    Array.isArray(quotation.packageOptions) &&
    quotation.packageOptions.length > 0
      ? quotation.packageOptions
      : [
          {
            name: "Option 1",
            hotelEntries: quotation.hotelSummary || [],
          },
        ];

  const selectedTransport = quotation.transportSummary
    ? {
        selectedVehicle: {
          type: quotation.transportSummary.vehicleName || "",
          perKmprice: quotation.transportSummary.perKmprice || 0,
          price: quotation.transportSummary.vehicleCost || 0,
          ac: quotation.transportSummary.ac || false,
          driverAllowance: quotation.transportSummary.driverAllowance || 0,
        },
        pricingType: quotation.transportSummary.pricingType || "fixed",
        isCustom: quotation.transportSummary.isCustom || false,
      }
    : null;

  const selectedActivities = quotation.activitySummary || [];
  const transportTotalPrice =
    quotation.transportSummary?.totalTransportCost || 0;
  const activityTotalPrice = selectedActivities.reduce(
    (sum, activity) => sum + (activity.totalPrice || 0),
    0,
  );
  const confirmedMarkup = quotation.markup || 0;
  const markupType = quotation.markupType || "lumpsum";
  const markupAmount = quotation.markupAmount || quotation.markup || 0;

  return {
    packageOptions,
    selectedTransport,
    selectedActivities,
    transportTotalPrice,
    activityTotalPrice,
    confirmedMarkup,
    markupType,
    markupAmount,
    hotels,
    appliedDiscount: quotation.discount ?? {   // ← add this
    type: "fixed",
    value: 0,
    notes: "",
    amount: 0,
  },
  };
};

// ─── Copy to Clipboard ───────────────────────────────────────────────────────
export const copyPackageSummary = (params) => {
  const summary = buildPackageSummary(params);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(summary)
      .then(() => toast("Package summary copied!"))
      .catch(() => toast.error("Copy failed"));
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = summary;
  ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
  document.body.appendChild(ta);
  try {
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    if (ok) toast("Package summary copied!");
    else toast.error("Copy failed.");
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
  if (!phone) toast("Opening WhatsApp. Select the guest manually.");
};
