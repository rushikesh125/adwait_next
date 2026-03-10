// src/utils/exportPackagePDF.js
// Standalone PDF export utility for travel package quotations.
// Usage: import { exportPackagePDF } from "@/utils/exportPackagePDF";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND = "#0D47A1";

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

// ─── Header / Footer ─────────────────────────────────────────────────────────
const addHeader = (pdfdoc, img) => {
  const lw = 40;
  const lh = (img.height * lw) / img.width;
  pdfdoc.addImage(img, "PNG", 15, 10, lw, lh);

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(16);
  pdfdoc.setTextColor(BRAND);
  pdfdoc.text("Adwait Tours", 60, 18);

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(10);
  pdfdoc.setTextColor("#444");
  pdfdoc.text("Travel Package Quotation", 60, 25);

  pdfdoc.setFontSize(8);
  pdfdoc.text("Phone: +91 9884798483",        160, 14);
  pdfdoc.text("Email: sales@adwaittours.com", 160, 19);
  pdfdoc.text("Web: www.adwaittours.com",     160, 24);

  pdfdoc.setDrawColor("#CCC");
  pdfdoc.setLineWidth(0.2);
  pdfdoc.line(15, 32, 200, 32);
};

const addFooter = (pdfdoc) => {
  pdfdoc.setDrawColor("#CCC");
  pdfdoc.setLineWidth(0.2);
  pdfdoc.line(15, 282, 200, 282);

  pdfdoc.setFontSize(8);
  pdfdoc.setTextColor("#444");
  pdfdoc.text("Thank you for choosing Adwait Tours!",            107, 287, { align: "center" });
  pdfdoc.text("For Reviews: Google Page | Follow Us: Instagram", 107, 291, { align: "center" });
};

// ─── Main Export Function ─────────────────────────────────────────────────────
/**
 * Generates and downloads a PDF quotation.
 *
 * @param {Object} params
 * @param {Array}   params.hotelEntries        - Saved hotel entries from Redux
 * @param {Object|null} params.selectedTransport  - Selected transport object from Redux
 * @param {Array}   params.selectedActivities  - Selected activities array from Redux
 * @param {number}  params.grandTotal          - Final grand total including markup
 * @param {string}  params.customerName        - Customer name
 * @param {string}  params.packageName         - Package name
 */
export const exportPackagePDF = ({
  hotelEntries,
  selectedTransport,
  selectedActivities,
  grandTotal,
  customerName,
  packageName,
}) => {
  if (!hotelEntries.length) {
    alert("Add at least one hotel before exporting.");
    return;
  }

  const pdfdoc = new jsPDF();
  const img = new Image();
  img.src = "/adwait-logo.jpg";

  img.onload = () => {
    // ── Page 1 header ──────────────────────────────────────────────────────
    addHeader(pdfdoc, img);

    // ── Customer / package meta table ──────────────────────────────────────
    let y = 42;
    autoTable(pdfdoc, {
      startY: y,
      body: [
        [
          "Customer Name:", customerName || "N/A",
          "Date:",          formatDate(new Date().toISOString()),
        ],
        [
          "Package Name:", packageName || "N/A",
          "Guests:",
          [
            `${hotelEntries[0]?.numDouble     || 0} Couple(s)`,
            `${hotelEntries[0]?.numExtraAdult || 0} Extra Adult(s)`,
            `${hotelEntries[0]?.numExtraChild || 0} Child(ren)`,
            ...(hotelEntries[0]?.numCNB > 0
              ? [`${hotelEntries[0].numCNB} CNB`]
              : []),
          ].join(", "),
        ],
      ],
      theme: "plain",
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35 },
        2: { fontStyle: "bold", cellWidth: 35 },
      },
      margin: { left: 15, right: 15 },
    });

    // ── Hotel details table ────────────────────────────────────────────────
    y = pdfdoc.lastAutoTable.finalY + 8;
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(11);
    pdfdoc.text("Hotel Details", 15, y);

    autoTable(pdfdoc, {
      startY: y + 5,
      head: [["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan"]],
      body: hotelEntries.map((h) => {
        const guestParts = [
          `${h.numDouble || 0} Rm`,
          ...(h.numExtraAdult > 0 ? [`${h.numExtraAdult} Ext.Adult`] : []),
          ...(h.numExtraChild > 0 ? [`${h.numExtraChild} Child`]     : []),
          ...(h.numCNB        > 0 ? [`${h.numCNB} CNB`]              : []),
        ];
        return [
          h.hotel,
          h.city,
          h.selectedRoomCategory,
          `${formatDate(h.checkInDate)} - ${formatDate(h.checkOutDate)}`,
          h.nights,
          MEAL_PLAN_LABELS[h.selectedMealPlan] || h.selectedMealPlan,
          guestParts.join("\n"),
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(pdfdoc, img),
    });

    // ── Grand total row ────────────────────────────────────────────────────
    y = pdfdoc.lastAutoTable.finalY;
    autoTable(pdfdoc, {
      startY: y + 10,
      body: [[
        {
          content: "Grand Total Tour Cost:",
          styles: { fontStyle: "bold", textColor: BRAND },
        },
        {
          content: `Rs. ${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
          styles: { halign: "right", fontStyle: "bold", textColor: BRAND },
        },
      ]],
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 120 } },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(pdfdoc, img),
    });

    // ── Inclusions & Exclusions ────────────────────────────────────────────
    y = pdfdoc.lastAutoTable.finalY + 12;
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(11);
    pdfdoc.text("Inclusions & Exclusions", 15, y);

    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(hotelEntries);

    const included = ["• Hotel accommodation as specified."];
    if (totalBreakfasts > 0) included.push(`• ${totalBreakfasts} Breakfast(s)`);
    if (totalLunches > 0)    included.push(`• ${totalLunches} Lunch(es)`);
    if (totalDinners > 0)    included.push(`• ${totalDinners} Dinner(s)`);
    if (!totalBreakfasts && !totalLunches && !totalDinners)
      included.push("• No meals included (EP Plan)");

    if (selectedTransport?.selectedVehicle) {
      const v = selectedTransport.selectedVehicle;
      included.push(`• Private ${v.type || v.name}${v.ac ? " (AC)" : ""}.`);
      included.push("• Toll, parking fees, driver allowance, and permits.");
    }

    selectedActivities?.forEach((a) =>
      included.push(`• ${a.name} (${a.city || "Custom"}) - ${a.participants} Person(s)`)
    );

    const excluded = [
      "• Train / Flight Fare.",
      "• Early check-in & late check-out.",
      "• Anything not in the Included list.",
    ];

    const colW = 85;
    const incExcBody = Array.from(
      { length: Math.max(included.length, excluded.length) },
      (_, i) => [
        included[i] ? pdfdoc.splitTextToSize(included[i], colW) : "",
        excluded[i] ? pdfdoc.splitTextToSize(excluded[i], colW) : "",
      ]
    );

    autoTable(pdfdoc, {
      startY: y + 5,
      head: [["INCLUDED", "EXCLUDED"]],
      body: incExcBody,
      headStyles: { fillColor: BRAND, halign: "center" },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(pdfdoc, img),
    });

    // ── Footer & save ──────────────────────────────────────────────────────
    addFooter(pdfdoc);
    pdfdoc.save("Travel_Package_Quotation.pdf");
  };

  img.onerror = () => alert("Could not load company logo.");
};