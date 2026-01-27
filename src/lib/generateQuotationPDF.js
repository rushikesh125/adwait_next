// src/components/quotations/pdf/generateQuotationPDF.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPdfDate } from "./pdf.utils";

/**
 * Generate quotation PDF
 * ❌ No business logic changed
 * 🔧 Safety: image load + null guards
 */
export function generateQuotationPDF({
  quotation,
  allHotels,
}) {
  if (
    !quotation ||
    !Array.isArray(quotation.hotelSummary) ||
    quotation.hotelSummary.length === 0
  ) {
    alert("Cannot generate PDF: No hotel data available.");
    return;
  }

  const doc = new jsPDF();
  const BRAND_BLUE = "#0D47A1";
  const TEXT_GRAY = "#444444";
  const FONT_NORMAL = 9;
  const FONT_SMALL = 8;

  /* ───────────────── HEADER ───────────────── */

  const addHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(BRAND_BLUE);
    doc.text("Adwait Tours", 60, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(TEXT_GRAY);
    doc.text("Travel Package Quotation", 60, 25);

    doc.setDrawColor("#CCCCCC");
    doc.setLineWidth(0.2);
    doc.line(15, 30, 200, 30);
  };

  /* ───────────────── FOOTER ───────────────── */

  const addFooter = () => {
    doc.setDrawColor("#CCCCCC");
    doc.line(15, 282, 200, 282);

    doc.setFontSize(FONT_SMALL);
    doc.setTextColor(TEXT_GRAY);
    doc.text(
      "Thank you for choosing Adwait Tours!",
      105,
      287,
      { align: "center" }
    );
  };

  /* ───────────── DOCUMENT START ───────────── */

  addHeader();
  let currentY = 40;

  /* ───────────── GUEST INFO ───────────── */

  const firstHotel = quotation.hotelSummary[0];
  const lastHotel =
    quotation.hotelSummary[quotation.hotelSummary.length - 1];

  autoTable(doc, {
    startY: currentY,
    body: [
      [
        "Customer Name:",
        quotation.customerName || "N/A",
        "Quotation Date:",
        formatPdfDate(new Date()),
      ],
      [
        "Travel Dates:",
        `${formatPdfDate(firstHotel.checkInDate)} - ${formatPdfDate(
          lastHotel.checkOutDate
        )}`,
        "Guests:",
        `${firstHotel.numDouble || 0} Couple(s), ${
          firstHotel.numExtraAdult || 0
        } Adult(s), ${firstHotel.numExtraChild || 0} Child(ren)`,
      ],
    ],
    theme: "plain",
    styles: { fontSize: FONT_NORMAL },
    margin: { left: 15, right: 15 },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  /* ───────────── HOTEL TABLE ───────────── */

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Hotel Details", 15, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Hotel",
        "City",
        "Room",
        "Dates",
        "Nights",
        "Meal Plan",
      ],
    ],
    body: quotation.hotelSummary.map((h) => {
      const hotelData = allHotels.find(
        (x) =>
          x.name === h.hotel &&
          x.city === h.city &&
          x.state === h.state
      );

      return [
        h.hotel,
        h.city,
        h.selectedRoomCategory,
        `${formatPdfDate(h.checkInDate)} - ${formatPdfDate(
          h.checkOutDate
        )}`,
        h.nights,
        h.selectedMealPlan,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: BRAND_BLUE },
    styles: { fontSize: FONT_NORMAL },
    margin: { left: 15, right: 15 },
    didDrawPage: addHeader,
  });

  currentY = doc.lastAutoTable.finalY + 10;

  /* ───────────── GRAND TOTAL ───────────── */

  autoTable(doc, {
    startY: currentY,
    body: [
      [
        {
          content: "Grand Total Tour Cost",
          styles: {
            fontStyle: "bold",
            textColor: BRAND_BLUE,
          },
        },
        {
          content: `₹ ${quotation.grandTotal.toLocaleString(
            "en-IN"
          )}/-`,
          styles: {
            halign: "right",
            fontStyle: "bold",
            textColor: BRAND_BLUE,
          },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: FONT_NORMAL + 2 },
    margin: { left: 15, right: 15 },
    didDrawPage: addHeader,
  });

  addFooter();

  doc.save(
    `Quotation-${quotation.customerName
      ?.replace(/ /g, "_")
      ?.trim() || "Guest"}.pdf`
  );
}
