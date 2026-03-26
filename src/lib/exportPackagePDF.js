// src/utils/exportPackagePDF.js
// Standalone PDF export utility for travel package quotations.
// Usage: import { exportPackagePDF } from "@/utils/exportPackagePDF";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND      = "#0D47A1";
const BRAND_DARK = "#0A3880";
const GREEN      = "#2E7D32";
const RED        = "#C62828";
const AMBER      = "#E65100";

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

/**
 * Ensure there is enough vertical space left on the current page.
 * If not, add a new page and re-draw the header.
 *
 * @param {jsPDF}  pdfdoc
 * @param {Image}  img
 * @param {number} currentY   – current cursor Y position
 * @param {number} needed     – minimum space required (pts)
 * @returns {number}           – updated Y position (either same or reset to top of new page)
 */
const ensureSpace = (pdfdoc, img, currentY, needed = 20) => {
  const pageH = pdfdoc.internal.pageSize.getHeight();
  if (currentY + needed > pageH - 20) {
    pdfdoc.addPage();
    addHeader(pdfdoc, img);
    return 42;
  }
  return currentY;
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

// ─── Section heading helper ───────────────────────────────────────────────────
const drawSectionHeading = (pdfdoc, text, y) => {
  // Filled band
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(15, y - 5, 180, 8, "F");
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(10);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(text, 18, y + 0.5);
  pdfdoc.setTextColor("#000000"); // reset
  return y + 8;
};

// ─── Checklist renderer (Inclusions / Exclusions / TnC / etc.) ───────────────
/**
 * Renders a titled checklist block and returns the new Y cursor.
 *
 * @param {jsPDF}    pdfdoc
 * @param {Image}    img
 * @param {string}   heading    – block title
 * @param {Array}    items      – [{text, selected}]
 * @param {number}   y          – starting Y
 * @param {string}   dotColor   – hex colour for bullet
 * @param {boolean}  selectedOnly – only render items where selected === true
 * @returns {number}
 */
const drawChecklist = (pdfdoc, img, heading, items, y, dotColor = BRAND, selectedOnly = true) => {
  const filtered = selectedOnly ? items.filter((i) => i.selected) : items;
  if (!filtered.length) return y;

  y = ensureSpace(pdfdoc, img, y, 14);

  // Heading
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(9);
  pdfdoc.setTextColor(dotColor);
  pdfdoc.text(heading, 15, y);
  y += 5;

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(8.5);
  pdfdoc.setTextColor("#333");

  const maxW = 175;
  filtered.forEach((item) => {
    y = ensureSpace(pdfdoc, img, y, 8);
    const lines = pdfdoc.splitTextToSize(`• ${item.text}`, maxW);
    pdfdoc.text(lines, 18, y);
    y += lines.length * 5;
  });

  return y + 3;
};

// ─── Day card renderer ────────────────────────────────────────────────────────
/**
 * Renders a single itinerary day and returns the new Y cursor.
 */
const drawDay = (pdfdoc, img, day, y) => {
  const pageH  = pdfdoc.internal.pageSize.getHeight();
  const dayTag = `Day ${day.dayNumber}${day.title ? " — " + day.title : ""}`;

  // Estimate height needed: tag (6) + description lines + 6 padding
  const descLines = day.description
    ? pdfdoc.splitTextToSize(day.description, 155).length
    : 0;
  const needed = 6 + descLines * 5 + 8;

  y = ensureSpace(pdfdoc, img, y, needed);

  // Day badge (rounded rect + text)
  pdfdoc.setFillColor(BRAND);
  pdfdoc.roundedRect(15, y - 4, 30, 6, 1, 1, "F");
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(7.5);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(`Day ${day.dayNumber}`, 18, y + 0.2);
  pdfdoc.setTextColor("#000000");

  // Day title (beside badge)
  if (day.title) {
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(9);
    pdfdoc.setTextColor(BRAND_DARK);
    pdfdoc.text(day.title, 50, y + 0.2);
  }

  y += 6;

  // Description
  if (day.description) {
    pdfdoc.setFont("helvetica", "normal");
    pdfdoc.setFontSize(8.5);
    pdfdoc.setTextColor("#333");
    const lines = pdfdoc.splitTextToSize(day.description, 170);
    lines.forEach((line) => {
      y = ensureSpace(pdfdoc, img, y, 6);
      pdfdoc.text(line, 18, y);
      y += 5;
    });
  }

  // Thin separator
  pdfdoc.setDrawColor("#E0E0E0");
  pdfdoc.setLineWidth(0.3);
  pdfdoc.line(15, y + 1, 200, y + 1);
  y += 5;

  return y;
};

// ─── Main Export Function ─────────────────────────────────────────────────────
/**
 * Generates and downloads a PDF quotation.
 *
 * @param {Object}       params
 * @param {Array}        params.hotelEntries        - Saved hotel entries from Redux
 * @param {Object|null}  params.selectedTransport   - Selected transport object from Redux
 * @param {Array}        params.selectedActivities  - Selected activities array from Redux
 * @param {number}       params.grandTotal          - Final grand total including markup
 * @param {string}       params.customerName        - Customer name
 * @param {string}       params.packageName         - Package name
 * @param {Object|null}  params.itineraryData       - Full itinerary object from ItineraryEditor
 *                         Shape: { title, state, cities, days[], inclusions[],
 *                                  exclusions[], tnc[], cancellation[], impInfo[] }
 */
export const exportPackagePDF = ({
  hotelEntries,
  selectedTransport,
  selectedActivities,
  grandTotal,
  customerName,
  packageName,
  itineraryData = null,
}) => {
  if (!hotelEntries.length) {
    alert("Add at least one hotel before exporting.");
    return;
  }

  const pdfdoc = new jsPDF();
  const img    = new Image();
  img.src      = "/adwait-logo.jpg";

  img.onload = () => {

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 1 — QUOTATION SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    addHeader(pdfdoc, img);

    // ── Customer / package meta ────────────────────────────────────────────
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

    // ── Hotel details ──────────────────────────────────────────────────────
    y = pdfdoc.lastAutoTable.finalY + 8;
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(11);
    pdfdoc.setTextColor(BRAND);
    pdfdoc.text("Hotel Details", 15, y);
    pdfdoc.setTextColor("#000");

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

    // ── Grand total ────────────────────────────────────────────────────────
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

    // ── Inclusions & Exclusions (legacy summary table) ─────────────────────
    y = pdfdoc.lastAutoTable.finalY + 12;
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(11);
    pdfdoc.setTextColor(BRAND);
    pdfdoc.text("Inclusions & Exclusions", 15, y);
    pdfdoc.setTextColor("#000");

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

    const colW         = 85;
    const incExcBody   = Array.from(
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

    // ── Footer page 1 ──────────────────────────────────────────────────────
    addFooter(pdfdoc);

    // ═══════════════════════════════════════════════════════════════════════
    // ITINERARY PAGES  (only if itineraryData exists and has content)
    // ═══════════════════════════════════════════════════════════════════════
    const itin = itineraryData;
    const hasDays = itin?.days?.length > 0;

    if (itin && hasDays) {
      pdfdoc.addPage();
      addHeader(pdfdoc, img);

      y = 42;

      // ── Itinerary title banner ───────────────────────────────────────────
      y = drawSectionHeading(
        pdfdoc,
        `Itinerary${itin.title ? ": " + itin.title : ""}`,
        y,
      );
      y += 6;

      // ── Cities row ──────────────────────────────────────────────────────
      if (itin.cities?.length) {
        pdfdoc.setFont("helvetica", "normal");
        pdfdoc.setFontSize(8);
        pdfdoc.setTextColor("#555");
        pdfdoc.text(`Cities: ${itin.cities.join("  •  ")}`, 15, y);
        y += 7;
      }

      // ── Day-wise program ─────────────────────────────────────────────────
      pdfdoc.setFont("helvetica", "bold");
      pdfdoc.setFontSize(9.5);
      pdfdoc.setTextColor(BRAND_DARK);
      pdfdoc.text("Day-wise Program", 15, y);
      y += 6;

      itin.days.forEach((day) => {
        y = drawDay(pdfdoc, img, day, y);
      });

      // ── Inclusions (from itinerary editor) ──────────────────────────────
      if (itin.inclusions?.some((i) => i.selected)) {
        y = ensureSpace(pdfdoc, img, y, 16);
        y += 4;
        y = drawSectionHeading(pdfdoc, "Inclusions", y);
        y += 4;
        y = drawChecklist(pdfdoc, img, "", itin.inclusions, y, GREEN, true);
      }

      // ── Exclusions ───────────────────────────────────────────────────────
      if (itin.exclusions?.some((i) => i.selected)) {
        y = ensureSpace(pdfdoc, img, y, 16);
        y += 2;
        y = drawSectionHeading(pdfdoc, "Exclusions", y);
        y += 4;
        y = drawChecklist(pdfdoc, img, "", itin.exclusions, y, RED, true);
      }

      // ── Terms & Conditions ───────────────────────────────────────────────
      const selectedTnc = (itin.tnc || []).filter((i) => i.selected);
      const selectedCan = (itin.cancellation || []).filter((i) => i.selected);

      if (selectedTnc.length || selectedCan.length) {
        y = ensureSpace(pdfdoc, img, y, 16);
        y += 4;
        y = drawSectionHeading(pdfdoc, "Terms & Conditions / Cancellation Policy", y);
        y += 4;

        if (selectedTnc.length) {
          y = drawChecklist(pdfdoc, img, "Terms & Conditions", itin.tnc, y, AMBER, true);
        }
        if (selectedCan.length) {
          y = drawChecklist(pdfdoc, img, "Cancellation Policy", itin.cancellation, y, RED, true);
        }
      }

      // ── Important Information ────────────────────────────────────────────
      if (itin.impInfo?.some((i) => i.selected)) {
        y = ensureSpace(pdfdoc, img, y, 16);
        y += 4;
        y = drawSectionHeading(pdfdoc, "Important Information", y);
        y += 4;
        y = drawChecklist(pdfdoc, img, "", itin.impInfo, y, BRAND, true);
      }

      // footer on last itinerary page
      addFooter(pdfdoc);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SAVE
    // ═══════════════════════════════════════════════════════════════════════
    pdfdoc.save("Travel_Package_Quotation.pdf");
  };

  img.onerror = () => alert("Could not load company logo.");
};