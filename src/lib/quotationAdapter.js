// src/utils/quotationAdapter.js
//
// Saved quotations (Firestore / "My Quotations") store data under:
//   quotation.hotelSummary       → array of hotel entries
//   quotation.transportSummary   → transport object  { vehicleName, price, ac, ... }
//   quotation.activitySummary    → array of activity entries
//
// Our shared utilities (exportPackagePDF, copyPackageSummary) expect:
//   hotelEntries       → same array, same field names  ✓  (no mapping needed)
//   selectedTransport  → { selectedVehicle: { type, price, ac }, name }
//   selectedActivities → same array  ✓  (no mapping needed)
//
// This file provides a single normalise function that bridges the two shapes
// so MyQuotations can reuse the exact same utilities without any duplication.

/**
 * Normalises a saved Firestore quotation into the parameter shape that
 * exportPackagePDF and copyPackageSummary both accept.
 *
 * @param {Object} quotation  - A single quotation document from Firestore
 * @returns {{
 *   hotelEntries:        Array,
 *   selectedTransport:   Object|null,
 *   selectedActivities:  Array,
 *   grandTotal:          number,
 *   customerName:        string,
 *   packageName:         string,
 * }}
 */
export const normaliseQuotation = (quotation) => {
  const {
    hotelSummary      = [],
    transportSummary  = null,
    activitySummary   = [],
    grandTotal        = 0,
    customerName      = "",
    leadName          = "",
    packageName       = "",
  } = quotation;

  // ── Transport: map saved flat shape → { selectedVehicle, name } ──────────
  // transportSummary shape (as saved in Create_new_package.jsx):
  // {
  //   packageName, vehicleName, price, ac, isCustom,
  //   perKmprice, pricingType, seats, vehicles, allPkgs
  // }
  let selectedTransport = null;
  if (transportSummary?.vehicleName || transportSummary?.price) {
    selectedTransport = {
      name: transportSummary.packageName || "Transport",
      selectedVehicle: {
        type:       transportSummary.vehicleName  || "",
        price:      transportSummary.price        || 0,
        ac:         transportSummary.ac           ?? false,
        isCustom:   transportSummary.isCustom     ?? false,
        perKmprice: transportSummary.perKmprice   || 0,
        seating:    transportSummary.seats        || "",
      },
      vehicles:    transportSummary.vehicles    || [],
      allPkgs:     transportSummary.allPkgs     || [],
      pricingType: transportSummary.pricingType || "fixed",
    };
  }

  return {
    hotelEntries:       hotelSummary,
    selectedTransport,
    selectedActivities: activitySummary,
    grandTotal:         Number(grandTotal) || 0,
    customerName:       customerName || leadName,
    packageName,
  };
};