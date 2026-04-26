export const QUOTATION_REJECTION_REASONS = [
  "Price too high",
  "Customer chose another package",
  "Dates not suitable",
  "Budget mismatch",
  "Destination or itinerary changed",
  "No response from customer",
  "Customer postponed the trip",
  "Other",
];

export function getQuotationReference(quotation) {
  if (quotation?.refNumber) return quotation.refNumber;
  if (quotation?.quoteNumber) return `Quote ${quotation.quoteNumber}`;
  if (quotation?.id) return `Quote ${String(quotation.id).slice(0, 8).toUpperCase()}`;
  return "Quote";
}

export function buildRejectionDetails({ reason, comment } = {}) {
  return [reason, comment].map((value) => value?.trim()).filter(Boolean).join(" - ");
}

export function buildQuotationRejectionNote(quotation, rejection = {}) {
  const details =
    rejection.details ||
    buildRejectionDetails({
      reason: rejection.reason || quotation?.rejectionReason,
      comment: rejection.comment || quotation?.rejectionComment,
    });

  return `${getQuotationReference(quotation)} - Rejected - ${details || "No reason provided"}`;
}
