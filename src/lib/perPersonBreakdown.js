// Per-person price breakdown for a package option.
//
// Splits the option's total cost into four guest buckets:
//   1. Default Adults (numDouble × 2 — the two adults sharing each Double room)
//   2. Extra Adults
//   3. Extra Children
//   4. CNB (Child No Bed)
//
// Allocation rules:
//   - Hotel cost: each room category's "double" subtotal feeds the Default Adult
//     bucket, "extraAdult" feeds Extra Adult, etc. Per-person = bucket / count.
//   - Transport: split equally across every guest (each person pays the same share).
//   - Activities: if activity.participants >= totalGuests it is paid by everyone;
//     otherwise (typically adult-only) it is split among Default + Extra Adults only.
//   - Markup / Discount:
//       • Percentage: each bucket scales by (1 ± p/100).
//       • Flat amount: distributed pro-rata across buckets by their pre-adjustment
//         subtotal share.
//
// The function is pure — it expects all numbers it needs to be supplied via args.
// Room categories should carry `bucketSubtotals` (added in handleSaveHotel /
// CustomHotelForm). If missing, we fall back to inline `pricing × counts × nights`
// (custom hotels) and finally to a count-weighted proportional split.

const num = (v) => Number(v) || 0;

const EMPTY_BUCKETS = () => ({
  defaultAdult: 0,
  extraAdult: 0,
  extraChild: 0,
  cnb: 0,
});

/**
 * Resolve the per-bucket subtotal for a single room category over the full stay.
 * Returns { defaultAdult, extraAdult, extraChild, cnb } in ₹.
 */
const getRoomBucketSubtotals = (roomCategory, hotelEntry) => {
  if (!roomCategory) return EMPTY_BUCKETS();

  // Preferred path — bucketSubtotals stored at save time
  const stored = roomCategory.bucketSubtotals;
  if (stored && typeof stored === "object") {
    return {
      defaultAdult: num(stored.defaultAdult ?? stored.double),
      extraAdult: num(stored.extraAdult),
      extraChild: num(stored.extraChild),
      cnb: num(stored.cnb),
    };
  }

  // Custom hotel — pricing is inline on the room category
  if (roomCategory.pricing) {
    const planKey = String(roomCategory.mealPlan || "").toLowerCase();
    const p = roomCategory.pricing[planKey];
    if (p) {
      const nights = num(hotelEntry?.nights);
      return {
        defaultAdult: num(p.double) * num(roomCategory.numDouble) * nights,
        extraAdult: num(p.extraAdult) * num(roomCategory.numExtraAdult) * nights,
        extraChild:
          num(p.extraChild) * num(roomCategory.numExtraChild) * nights,
        cnb: num(p.cnb) * num(roomCategory.numCNB) * nights,
      };
    }
  }

  // Fallback — proportional split of room total by guest-count weights.
  // Not exact (assumes equal per-head pricing across buckets) but keeps the
  // breakdown UI functional for legacy quotations that lack pricing data.
  const numDouble = num(roomCategory.numDouble);
  const numExtraAdult = num(roomCategory.numExtraAdult);
  const numExtraChild = num(roomCategory.numExtraChild);
  const numCNB = num(roomCategory.numCNB);
  const headcount = numDouble * 2 + numExtraAdult + numExtraChild + numCNB;
  const price = num(roomCategory.price);
  if (price <= 0 || headcount <= 0) return EMPTY_BUCKETS();
  const perHead = price / headcount;
  return {
    defaultAdult: perHead * numDouble * 2,
    extraAdult: perHead * numExtraAdult,
    extraChild: perHead * numExtraChild,
    cnb: perHead * numCNB,
  };
};

/**
 * Aggregate guest counts and hotel bucket subtotals across an option.
 */
const aggregateOption = (packageOption) => {
  const hotelBuckets = EMPTY_BUCKETS();
  let totalNumDouble = 0;
  let totalExtraAdult = 0;
  let totalExtraChild = 0;
  let totalCNB = 0;

  const hotelEntries = packageOption?.hotelEntries || [];
  hotelEntries.forEach((entry) => {
    const rooms = entry.roomCategories || [];
    rooms.forEach((rc) => {
      const sub = getRoomBucketSubtotals(rc, entry);
      hotelBuckets.defaultAdult += sub.defaultAdult;
      hotelBuckets.extraAdult += sub.extraAdult;
      hotelBuckets.extraChild += sub.extraChild;
      hotelBuckets.cnb += sub.cnb;
    });
  });

  // Guest counts are taken from the first hotel entry's primary room
  // (the quotation editor keeps these consistent across hotels).
  const firstEntry = hotelEntries[0];
  if (firstEntry) {
    const firstRoom = (firstEntry.roomCategories || [])[0] || firstEntry;
    totalNumDouble = num(firstRoom.numDouble ?? firstEntry.numDouble);
    totalExtraAdult = num(
      firstRoom.numExtraAdult ?? firstEntry.numExtraAdult,
    );
    totalExtraChild = num(
      firstRoom.numExtraChild ?? firstEntry.numExtraChild,
    );
    totalCNB = num(firstRoom.numCNB ?? firstEntry.numCNB);
  }

  return {
    hotelBuckets,
    counts: {
      defaultAdult: totalNumDouble * 2,
      extraAdult: totalExtraAdult,
      extraChild: totalExtraChild,
      cnb: totalCNB,
    },
  };
};

/**
 * Build the per-person breakdown for an option.
 *
 * @param {Object} input
 * @param {Object} input.packageOption        – option with hotelEntries
 * @param {number} input.transportTotalPrice  – shared transport cost (₹)
 * @param {Array}  input.selectedActivities   – activities with .totalPrice + .participants
 * @param {number} input.optionMarkupAmount   – resolved markup in ₹ for THIS option
 * @param {number} input.optionDiscountAmount – resolved discount in ₹ for THIS option
 * @returns {{
 *   buckets: Array<{ key:string, label:string, count:number, perPerson:number, lineTotal:number }>,
 *   grandTotal: number,
 *   totalGuests: number,
 * }}
 */
export const computePerPersonBreakdown = ({
  packageOption,
  transportTotalPrice = 0,
  selectedActivities = [],
  optionMarkupAmount = 0,
  optionDiscountAmount = 0,
}) => {
  const { hotelBuckets, counts } = aggregateOption(packageOption);
  const totalGuests =
    counts.defaultAdult + counts.extraAdult + counts.extraChild + counts.cnb;

  // Build the raw bucket subtotals (pre markup/discount).
  const subtotals = { ...hotelBuckets };

  // Transport — equally split across every guest. If there are no guests we
  // still need to absorb the cost somewhere; we drop it into defaultAdult so
  // the grand total stays correct (the UI will just show ₹0 lines for empty
  // buckets in that edge case).
  if (totalGuests > 0 && transportTotalPrice > 0) {
    const perHead = transportTotalPrice / totalGuests;
    subtotals.defaultAdult += perHead * counts.defaultAdult;
    subtotals.extraAdult += perHead * counts.extraAdult;
    subtotals.extraChild += perHead * counts.extraChild;
    subtotals.cnb += perHead * counts.cnb;
  } else if (transportTotalPrice > 0) {
    subtotals.defaultAdult += transportTotalPrice;
  }

  // Activities — bucketing depends on `participants`.
  const adultsOnlyCount = counts.defaultAdult + counts.extraAdult;
  (selectedActivities || []).forEach((act) => {
    const cost = num(act?.totalPrice);
    if (cost <= 0) return;
    const participants = num(act?.participants);
    const splitAcrossAll = participants >= totalGuests && totalGuests > 0;
    if (splitAcrossAll) {
      const perHead = cost / totalGuests;
      subtotals.defaultAdult += perHead * counts.defaultAdult;
      subtotals.extraAdult += perHead * counts.extraAdult;
      subtotals.extraChild += perHead * counts.extraChild;
      subtotals.cnb += perHead * counts.cnb;
    } else if (adultsOnlyCount > 0) {
      const perHead = cost / adultsOnlyCount;
      subtotals.defaultAdult += perHead * counts.defaultAdult;
      subtotals.extraAdult += perHead * counts.extraAdult;
    } else {
      // No adults — fall back to all guests
      const denom = totalGuests > 0 ? totalGuests : 1;
      const perHead = cost / denom;
      subtotals.defaultAdult += perHead * counts.defaultAdult;
      subtotals.extraAdult += perHead * counts.extraAdult;
      subtotals.extraChild += perHead * counts.extraChild;
      subtotals.cnb += perHead * counts.cnb;
    }
  });

  // Markup — pro-rata against the current bucket subtotals.
  const subtotalSum =
    subtotals.defaultAdult +
    subtotals.extraAdult +
    subtotals.extraChild +
    subtotals.cnb;
  if (optionMarkupAmount && subtotalSum > 0) {
    const factor = 1 + optionMarkupAmount / subtotalSum;
    subtotals.defaultAdult *= factor;
    subtotals.extraAdult *= factor;
    subtotals.extraChild *= factor;
    subtotals.cnb *= factor;
  }

  // Discount — same pro-rata model, against the post-markup subtotals.
  const postMarkupSum =
    subtotals.defaultAdult +
    subtotals.extraAdult +
    subtotals.extraChild +
    subtotals.cnb;
  if (optionDiscountAmount && postMarkupSum > 0) {
    const factor = 1 - optionDiscountAmount / postMarkupSum;
    subtotals.defaultAdult *= factor;
    subtotals.extraAdult *= factor;
    subtotals.extraChild *= factor;
    subtotals.cnb *= factor;
  }

  const buildBucket = (key, label, count, lineTotal) => ({
    key,
    label,
    count,
    lineTotal: Math.round(lineTotal),
    perPerson: count > 0 ? Math.round(lineTotal / count) : 0,
  });

  const buckets = [
    buildBucket(
      "defaultAdult",
      "Adult (Couple)",
      counts.defaultAdult,
      subtotals.defaultAdult,
    ),
    buildBucket(
      "extraAdult",
      "Extra Adult",
      counts.extraAdult,
      subtotals.extraAdult,
    ),
    buildBucket(
      "extraChild",
      "Extra Child",
      counts.extraChild,
      subtotals.extraChild,
    ),
    buildBucket("cnb", "Child No Bed (CNB)", counts.cnb, subtotals.cnb),
  ].filter((b) => b.count > 0);

  const grandTotal = buckets.reduce((s, b) => s + b.lineTotal, 0);

  return { buckets, grandTotal, totalGuests };
};
