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
export const normaliseQuotation = (q) => {
  if (!q) return {};

  return {
    customerName: q.customerName || q.leadName || "",
    packageName: q.packageName || "",

    hotelEntries: q.hotelSummary || [],

    selectedTransport: q.transportSummary
      ? {
          name: q.transportSummary.packageName || "Custom",
          pricingType: q.transportSummary.pricingType || "fixed",
          selectedVehicle: {
            type: q.transportSummary.vehicleName || "",
            ac: q.transportSummary.ac || false,
            price: q.transportSummary.vehicleCost || 0,
            perKmprice: q.transportSummary.perKmprice || 0,
            driverAllowance: q.transportSummary.driverAllowance || 0,
            isCustom: q.transportSummary.isCustom || false,
          },

          // ✅ optional but recommended
          minKm: q.transportSummary.minKm || 0,
          tollCharges: q.transportSummary.tollCharges || 0,
          permitCharges: q.transportSummary.permitCharges || 0,
          otherCharges: q.transportSummary.otherCharges || 0,
        }
      : null,

    // ✅ FIXED HERE
    selectedActivities: q.activitySummary || [],

    grandTotal: q.grandTotal || 0,

    itineraryData: q.itinerarySummary || null,

    refNumber: q.refNumber || null,
  };
};