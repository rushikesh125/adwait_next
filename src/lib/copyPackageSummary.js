// src/lib/copyPackageSummary.js
// Updated: per-option markup support + transport/activity shown without price

import toast from "react-hot-toast";
import { computePerPersonBreakdown } from "@/lib/perPersonBreakdown";

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

/**
 * Resolve the effective hotel total from either multi-room-category or legacy flat structure.
 */
const resolveEntryTotal = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return entry.roomCategories.reduce((s, rc) => s + Number(rc.price || 0), 0);
  }
  return Number(entry.hotelTotal || 0);
};

/**
 * Get the primary meal plan for an entry (from first room category or legacy field).
 */
const getPrimaryMealPlan = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return entry.roomCategories[0]?.mealPlan || entry.selectedMealPlan || "";
  }
  return entry.selectedMealPlan || entry.mealPlan || "";
};

/**
 * Get the primary room category label for an entry.
 */
const getPrimaryRoomCategory = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return entry.roomCategories[0]?.roomCategory || entry.selectedRoomCategory || "";
  }
  return entry.selectedRoomCategory || entry.roomCategory || "";
};

const calculateTotalMeals = (entries) => {
  let totalBreakfasts = 0,
    totalLunches = 0,
    totalDinners = 0;
  entries.forEach((entry) => {
    const n = parseInt(entry.nights, 10);
    if (isNaN(n)) return;
    // For multi-room entries, count meals per room category (since guests differ)
    const plans = Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0
      ? entry.roomCategories.map((rc) => rc.mealPlan).filter(Boolean)
      : [getPrimaryMealPlan(entry)].filter(Boolean);
    // Use unique meal plans (deduplicated) to avoid double-counting the same plan
    const uniquePlans = [...new Set(plans)];
    uniquePlans.forEach((mp) => {
      if (mp === "CP") {
        totalBreakfasts += n;
      }
      if (mp === "MAP") {
        totalBreakfasts += n;
        totalDinners += n;
      }
      if (mp === "AP") {
        totalBreakfasts += n;
        totalLunches += n;
        totalDinners += n;
      }
    });
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
      (s, e) => s + resolveEntryTotal(e),
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
    (s, e) => s + resolveEntryTotal(e),
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
  includePriceBreakdown = false,
  selectedActivities = [],
) => {
  const hotelEntries = option.hotelEntries || [];
  if (hotelEntries.length === 0) {
    return isMultiOption
      ? `*${option.name}*\nNo hotels added.\n`
      : `No hotels added.\n`;
  }

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

    // One-liner: "<N Room(s) — CATEGORY> | <Meal Plan> | <Occupancy>"
    // Occupancy collapses N rooms × 2 adults plus any extras into a phrase
    // like "2 Adults" or "4 Adults + 1 Extra Adult + 2 Children + 1 CNB".
    const formatRoomLine = (rc, mealLabel) => {
      const rooms = Number(rc.numDouble) || 0;
      const adults = rooms * 2;
      const category = (rc.roomCategory || "—").toUpperCase();
      const occupancyParts = [`${adults} Adult${adults !== 1 ? "s" : ""}`];
      if ((rc.numExtraAdult || 0) > 0)
        occupancyParts.push(`${rc.numExtraAdult} Extra Adult${rc.numExtraAdult !== 1 ? "s" : ""}`);
      if ((rc.numExtraChild || 0) > 0)
        occupancyParts.push(`${rc.numExtraChild} Child${rc.numExtraChild !== 1 ? "ren" : ""}`);
      if ((rc.numCNB || 0) > 0) occupancyParts.push(`${rc.numCNB} CNB`);
      const roomsPart = `${rooms} Room${rooms !== 1 ? "s" : ""} — ${category}`;
      return `${roomsPart} | ${mealLabel} | ${occupancyParts.join(" + ")}`;
    };

    // Single line per room category — same shape whether the hotel has one
    // room category or several. Each category is its own self-contained line.
    const categories =
      Array.isArray(e.roomCategories) && e.roomCategories.length > 0
        ? e.roomCategories
        : [
            {
              roomCategory: getPrimaryRoomCategory(e),
              mealPlan: getPrimaryMealPlan(e),
              numDouble: e.numDouble || 0,
              numExtraAdult: e.numExtraAdult || 0,
              numExtraChild: e.numExtraChild || 0,
              numCNB: e.numCNB || 0,
            },
          ];

    categories.forEach((rc) => {
      const mealLabel = MEAL_PLAN_LABELS[rc.mealPlan] || rc.mealPlan || "—";
      s += ` ⇒ ${formatRoomLine(rc, mealLabel)}\n`;
    });

    s += ` ⇒ ${formatDate(e.checkInDate)} to ${formatDate(e.checkOutDate)} (${e.nights} Night${e.nights > 1 ? "s" : ""})\n\n`;
  });

  // Grand total per option
// AFTER
// Prefer pre-stored totals (saved by Create_new_package) over recomputation
const preDiscountTotal =
  typeof option.preDiscountTotal === "number"
    ? option.preDiscountTotal
    : calcOptionGrandTotal(option, transportTotal, activityTotal, optionMarkup);

const discountAmount =
  typeof option.discountAmount === "number" && option.discountAmount > 0
    ? option.discountAmount
    : (() => {
        if (!appliedDiscount?.value || appliedDiscount.value <= 0) return 0;
        if (appliedDiscount.type === "percentage") {
          return Math.round((appliedDiscount.value / 100) * preDiscountTotal);
        }
        return Math.min(Number(appliedDiscount.value), preDiscountTotal);
      })();

const finalTotal =
  typeof option.grandTotal === "number"
    ? option.grandTotal
    : preDiscountTotal - discountAmount;

  // Build the inline per-person suffix once — appended after the total on the
  // same line when the agent has opted in.
  let perPersonSuffix = "";
  if (includePriceBreakdown) {
    const breakdown = computePerPersonBreakdown({
      packageOption: option,
      transportTotalPrice: transportTotal,
      selectedActivities: selectedActivities || [],
      optionMarkupAmount: optionMarkup,
      optionDiscountAmount: discountAmount,
    });
    if (breakdown.buckets.length > 0) {
      const parts = breakdown.buckets.map(
        (b) =>
          `${b.label} ₹${b.perPerson.toLocaleString("en-IN")}/pp${
            b.count > 1 ? ` ×${b.count}` : ""
          }`,
      );
      perPersonSuffix = ` — ${parts.join(" | ")}`;
    }
  }

  if (discountAmount > 0) {
    s += `Package Cost: ₹${preDiscountTotal.toLocaleString("en-IN")}/-\n`;
    s += `Special Discount${appliedDiscount.notes ? ` (${appliedDiscount.notes})` : ""}: −₹${discountAmount.toLocaleString("en-IN")}/-\n`;
    s += `*Final Package Cost: ₹${finalTotal.toLocaleString("en-IN")}/-*${perPersonSuffix}\n`;
  } else {
    s += `*TOTAL TOUR COST: ₹${preDiscountTotal.toLocaleString("en-IN")}/-*${perPersonSuffix}\n`;
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
  includePriceBreakdown = false,
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
      includePriceBreakdown,
      selectedActivities,
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
    includePriceBreakdown: Boolean(quotation.includePriceBreakdown),
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
