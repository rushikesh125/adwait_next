// src/components/quotations/pdf/pdf.utils.js

/**
 * Format date for PDF (Firestore Timestamp | Date | string)
 */
export function formatPdfDate(dateData) {
  if (!dateData) return "N/A";

  const date = dateData?.seconds
    ? new Date(dateData.seconds * 1000)
    : new Date(dateData);

  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
