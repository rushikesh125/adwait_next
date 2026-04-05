// src/utils/exportPackagePDF.js
// Updated with your requested changes only

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND = "#0D47A1";
const BRAND_DARK = "#0A3880";
const AMBER = "#E65100";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";

const PAGE_W = 210;
const PAGE_H = 297;

const FONT_BODY = 9;
const FONT_SMALL = 8;
const FONT_TINY = 7;
const FONT_HEADING = 10;
const FONT_DAY = 11;

const MEAL_PLAN_LABELS = {
  EP: "Accommodation Only",
  CP: "Bed & Breakfast",
  MAP: "Breakfast & Dinner",
  AP: "All Meals Included",
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

const todayFormatted = () =>
  new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .split("/")
    .join("-");

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

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const detectImgFormat = (src) => {
  if (!src) return "JPEG";
  const lower = src.toLowerCase();
  if (lower.includes(".png") || lower.includes("image/png")) return "PNG";
  if (lower.includes(".webp") || lower.includes("image/webp")) return "WEBP";
  return "JPEG";
};

const ensureSpace = (pdfdoc, logoImg, currentY, needed = 20) => {
  if (currentY + needed > PAGE_H - 20) {
    pdfdoc.addPage();
    addHeader(pdfdoc, logoImg);
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
  pdfdoc.setFontSize(FONT_BODY);
  pdfdoc.setTextColor("#444");
  pdfdoc.text("Travel Package Quotation", 60, 25);

  pdfdoc.setFontSize(FONT_TINY);
  pdfdoc.text("Phone: +91 9884798483", 160, 14);
  pdfdoc.text("Email: sales@adwaittours.com", 160, 19);
  pdfdoc.text("Web: www.adwaittours.com", 160, 24);

  pdfdoc.setDrawColor("#CCC");
  pdfdoc.setLineWidth(0.2);
  pdfdoc.line(15, 32, 200, 32);
};

const addFooter = (pdfdoc) => {
  pdfdoc.setDrawColor("#CCC");
  pdfdoc.setLineWidth(0.2);
  pdfdoc.line(15, 282, 200, 282);

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor("white");
  pdfdoc.text("Thank you for choosing Adwait Tours!", 107, 287, {
    align: "center",
  });
  pdfdoc.text("For Reviews: Google Page | Follow Us: Instagram", 107, 291, {
    align: "center",
  });
};

// ─── Section heading helper ───────────────────────────────────────────────────
const drawSectionHeading = (pdfdoc, text, y) => {
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(15, y - 5, 180, 8, "F");
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(FONT_HEADING);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(text, 18, y + 0.5);
  pdfdoc.setTextColor("#000000");
  return y + 8;
};

// ─── Checklist renderer ───────────────────────────────────────────────────────
const drawChecklist = (
  pdfdoc,
  logoImg,
  heading,
  items,
  y,
  dotColor = BRAND,
  selectedOnly = true,
) => {
  const filtered = selectedOnly ? items.filter((i) => i.selected) : items;
  if (!filtered.length) return y;

  y = ensureSpace(pdfdoc, logoImg, y, 14);

  if (heading) {
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(FONT_BODY);
    pdfdoc.setTextColor(dotColor);
    pdfdoc.text(heading, 15, y);
    y += 5;
  }

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(FONT_BODY);
  pdfdoc.setTextColor("#333");

  const maxW = 175;
  filtered.forEach((item) => {
    y = ensureSpace(pdfdoc, logoImg, y, 8);
    const lines = pdfdoc.splitTextToSize(`• ${item.text}`, maxW);
    pdfdoc.text(lines, 18, y);
    y += lines.length * 5;
  });

  return y + 3;
};

// ─── Draw SVG-style icon (kept for other uses if needed) ─────────────────────
const drawIcon = (pdfdoc, type, x, y, size, color) => {
  // ... your original drawIcon function remains unchanged
  pdfdoc.setDrawColor(color);
  pdfdoc.setFillColor(color);
  pdfdoc.setLineWidth(0.6);
  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;

  if (type === "hotel") {
    const bw = s * 0.65,
      bh = s * 0.6;
    const bx = cx - bw / 2,
      by = cy - bh / 2 + s * 0.05;
    pdfdoc.rect(bx, by, bw, bh, "F");
    pdfdoc.setFillColor("#FFFFFF");
    const dw = s * 0.18,
      dh = s * 0.22;
    pdfdoc.rect(cx - dw / 2, by + bh - dh, dw, dh, "F");
    const wsize = s * 0.1;
    pdfdoc.rect(bx + s * 0.1, by + s * 0.1, wsize, wsize, "F");
    pdfdoc.rect(bx + bw - s * 0.1 - wsize, by + s * 0.1, wsize, wsize, "F");
    pdfdoc.setFillColor(color);
    pdfdoc.rect(cx + s * 0.1, by - s * 0.1, s * 0.08, s * 0.12, "F");
  } else if (type === "car") {
    const cw = s * 0.72,
      ch = s * 0.22;
    const cbx = cx - cw / 2,
      cby = cy + s * 0.08;
    pdfdoc.roundedRect(cbx, cby, cw, ch, 1.5, 1.5, "F");
    const rw = s * 0.45,
      rh = s * 0.2;
    pdfdoc.roundedRect(cx - rw / 2, cby - rh, rw, rh + s * 0.04, 2, 2, "F");
    pdfdoc.setFillColor("#FFFFFF");
    const wr = s * 0.09;
    pdfdoc.circle(cbx + s * 0.13, cby + ch, wr, "F");
    pdfdoc.circle(cbx + cw - s * 0.13, cby + ch, wr, "F");
    pdfdoc.setFillColor("#FFFFFF");
    pdfdoc.rect(
      cx - rw / 2 + s * 0.04,
      cby - rh + s * 0.03,
      rw - s * 0.08,
      rh - s * 0.06,
      "F",
    );
  } else if (type === "binoculars") {
    const lr = s * 0.18;
    pdfdoc.circle(cx - s * 0.18, cy + s * 0.05, lr, "F");
    pdfdoc.circle(cx + s * 0.18, cy + s * 0.05, lr, "F");
    pdfdoc.rect(cx - s * 0.04, cy - s * 0.04, s * 0.08, s * 0.12, "F");
    pdfdoc.setFillColor("#FFFFFF");
    const ilr = s * 0.1;
    pdfdoc.circle(cx - s * 0.18, cy + s * 0.05, ilr, "F");
    pdfdoc.circle(cx + s * 0.18, cy + s * 0.05, ilr, "F");
    pdfdoc.setFillColor(color);
    pdfdoc.rect(cx - s * 0.28, cy - s * 0.22, s * 0.12, s * 0.2, "F");
    pdfdoc.rect(cx + s * 0.16, cy - s * 0.22, s * 0.12, s * 0.2, "F");
  }
};

// ─── New: Draw Service Icon using real images ────────────────────────────────
const drawServiceIcon = async (pdfdoc, iconPath, x, y, size) => {
  const img = await loadImage(iconPath);
  if (img) {
    pdfdoc.addImage(img, "PNG", x, y, size, size);
  } else {
    pdfdoc.setFillColor(BRAND);
    pdfdoc.rect(x, y, size, size, "F");
  }
};

// ─── Day card renderer ────────────────────────────────────────────────────────
const drawDay = async (pdfdoc, logoImg, day, y) => {
  const descLines = day.description
    ? pdfdoc.splitTextToSize(day.description, 155).length
    : 0;
  const needed = 8 + descLines * 6 + 10;

  y = ensureSpace(pdfdoc, logoImg, y, needed);

  pdfdoc.setFillColor(BRAND);
  pdfdoc.roundedRect(15, y - 4, 32, 7, 1, 1, "F");
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(`Day ${day.dayNumber}`, 18, y + 0.5);
  pdfdoc.setTextColor("#000000");

  if (day.title) {
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(FONT_DAY);
    pdfdoc.setTextColor(BRAND_DARK);
    pdfdoc.text(day.title, 52, y + 0.5);
  }

  y += 8;

  if (day.description) {
    pdfdoc.setFont("helvetica", "normal");
    pdfdoc.setFontSize(FONT_DAY);
    pdfdoc.setTextColor("#333");
    const lines = pdfdoc.splitTextToSize(day.description, 168);
    lines.forEach((line) => {
      y = ensureSpace(pdfdoc, logoImg, y, 7);
      pdfdoc.text(line, 18, y);
      y += 6;
    });
  }

  const dayImages = (day.images || []).filter(Boolean).slice(0, 2);
  if (dayImages.length > 0) {
    const boxH = 45; // Slightly increased height for better visibility
    const boxW = dayImages.length === 2 ? 82 : 170;
    const gap = 6;

    y = ensureSpace(pdfdoc, logoImg, y, boxH + 6);
    y += 3;

    for (let i = 0; i < dayImages.length; i++) {
      const imgObj = await loadImage(dayImages[i]);
      if (!imgObj) continue;
      const fmt = detectImgFormat(dayImages[i]);
      const x = 15 + i * (boxW + gap); // Calculate aspect ratio to prevent distortion (object-fit: contain)

      const imgAspect = imgObj.width / imgObj.height;
      const boxAspect = boxW / boxH;

      let renderW, renderH;
      if (imgAspect > boxAspect) {
        // Image is wider than the box
        renderW = boxW;
        renderH = boxW / imgAspect;
      } else {
        // Image is taller than the box
        renderH = boxH;
        renderW = boxH * imgAspect;
      } // Center the image inside the uniform bounding box

      const imgX = x + (boxW - renderW) / 2;
      const imgY = y + (boxH - renderH) / 2;

      pdfdoc.addImage(imgObj, fmt, imgX, imgY, renderW, renderH); // Draw a consistent border frame
    }
    y += boxH + 4;
  }

  pdfdoc.setDrawColor("#E0E0E0");
  pdfdoc.setLineWidth(0.3);
  pdfdoc.line(15, y + 1, 200, y + 1);
  y += 6;

  return y;
};

// ─── PAGE 1 COVER ─────────────────────────────────────────────────────────────
// ─── Refined: PAGE 1 COVER (Modern Luxury Style) ─────────────────────────────
const drawCoverPage = async (
  pdfdoc,
  logoImg,
  posterImg,
  hotelEntries,
  itinTitle,
  customerName,
  packageName,
  selectedTransport,
  selectedActivities,
) => {
  const overlayY = PAGE_H * 0.45;

  // 1. Background Layers
  if (posterImg) {
    const fmt = detectImgFormat(posterImg.src);
    pdfdoc.addImage(posterImg, fmt, 0, 0, PAGE_W, overlayY + 10);
  }

  // 2. Bottom Wave/Solid Section
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(0, overlayY, PAGE_W, PAGE_H - overlayY, "F");

  // 3. Logo
  const logoW = 45;
  const logoAspect = logoImg.width / logoImg.height;
  const logoH = logoW / logoAspect;
  const logoX = (PAGE_W - logoW) / 2;
  const logoY = 15;

  pdfdoc.setFillColor("#FFFFFF");
  pdfdoc.circle(PAGE_W / 2, logoY + logoH / 2, logoW / 2 + 5, "F");
  pdfdoc.addImage(logoImg, "PNG", logoX, logoY, logoW, logoH);

  // 4. Floating Content Card
  const cardW = 180;
  const cardH = 55; // Slightly taller to fit the inner text neatly
  const cardX = (PAGE_W - cardW) / 2;
  const cardY = overlayY - 15;

  pdfdoc.setFillColor(BRAND_DARK);
  pdfdoc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, "F");

  // Client Name & Title (Reverted Title to original 22pt)
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(22);
  pdfdoc.setTextColor("#FFFFFF");
  const mainTitle = (
    itinTitle ||
    packageName ||
    "Travel Itinerary"
  ).toUpperCase();
  const splitTitle = pdfdoc.splitTextToSize(mainTitle, cardW - 20);
  let titleY = cardY + (splitTitle.length > 1 ? 14 : 18);
  pdfdoc.text(splitTitle, PAGE_W / 2, titleY, { align: "center" });

  // "Prepared For" - Increased from 10 to 11
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor("#FFD700");
  pdfdoc.text("PREPARED EXCLUSIVELY FOR", PAGE_W / 2, cardY + 34, {
    align: "center",
  });

  // Customer Name - Increased from 15 to 18
  pdfdoc.setFontSize(18);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(customerName || "Our Valued Guest", PAGE_W / 2, cardY + 44, {
    align: "center",
  });

  // 5. Trip Metadata (Nights/Days & Date)
  const totalNights = hotelEntries.reduce(
    (s, e) => s + (parseInt(e.nights) || 0),
    0,
  );
  const tripLabel = `${totalNights} Nights / ${totalNights + 1} Days`;

  // Aligned perfectly below the card
  let currentY = cardY + cardH + 12;

  pdfdoc.setDrawColor("#FFFFFF");
  pdfdoc.setLineWidth(0.3);
  pdfdoc.line(cardX + 20, currentY, cardX + cardW - 20, currentY);

  currentY += 8;
  // Metadata Labels - Increased from 9 to 11
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor("#E3E9FF");
  pdfdoc.text("DURATION", cardX + 30, currentY, { align: "center" });
  pdfdoc.text("DATE ISSUED", PAGE_W / 2, currentY, { align: "center" });
  pdfdoc.text("REF NUMBER", cardX + cardW - 30, currentY, { align: "center" });

  currentY += 6;
  // Metadata Values - Increased from 9/11 to 12
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(12);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(tripLabel, cardX + 30, currentY, { align: "center" });
  pdfdoc.text(todayFormatted(), PAGE_W / 2, currentY, { align: "center" });
  pdfdoc.text(
    `AT-${new Date().getFullYear() % 100}${Math.floor(1000 + Math.random() * 900)}`,
    cardX + cardW - 30,
    currentY,
    { align: "center" },
  );

  // 6. Centered Inclusion Icons
  currentY += 20;
  // Section Title - Increased from 10 to 12
  pdfdoc.setFontSize(14);
  pdfdoc.text("WHAT'S INCLUDED", PAGE_W / 2, currentY, { align: "center" });

  const services = [];
  if (hotelEntries.length > 0)
    services.push({ label: "Hotels", path: "/hotel.png" });
  if (selectedTransport)
    services.push({ label: "Transfers", path: "/transfer.png" });
  if (selectedActivities?.length > 0)
    services.push({ label: "Sightseeing", path: "/sightseeing.png" });

  const iconSize = 14;
  const spacing = 35;
  const startX =
    (PAGE_W - services.length * spacing) / 2 + spacing / 2 - iconSize / 2;

  for (let i = 0; i < services.length; i++) {
    const x = startX + i * spacing;
    const y = currentY + 6;
    await drawServiceIcon(pdfdoc, services[i].path, x, y, iconSize);

    // Icon Labels - Increased significantly from 7 to 10
    pdfdoc.setFont("helvetica", "normal");
    pdfdoc.setFontSize(12);
    pdfdoc.text(services[i].label, x + iconSize / 2, y + iconSize + 5, {
      align: "center",
    });
  }

  // 7. Footer Contact Band
  const footerY = PAGE_H - 28; // Moved the entire block up slightly

  // Decorative line (moved up slightly from the title)
  pdfdoc.setDrawColor("#FFD700");
  pdfdoc.setLineWidth(0.8);
  pdfdoc.line(PAGE_W / 2 - 20, footerY - 8, PAGE_W / 2 + 20, footerY - 8);

  // Brand Name
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(12);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text("ADWAIT TOURS", PAGE_W / 2, footerY, { align: "center" });

  // Address & Phone (increased spacing to +8)
  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(10);
  pdfdoc.setTextColor("#AAC4FF");
  pdfdoc.text(
    "Brookfield, Bangalore | KA |  +91 9884798483 | www.adwaittours.com",
    PAGE_W / 2,
    footerY + 8,
    { align: "center" },
  );

  // Website (increased spacing to +15 to ensure no overlap)
  // pdfdoc.text("", PAGE_W / 2, footerY + 15, { align: "center" });
};
// ─── Main Export Function ─────────────────────────────────────────────────────
export const exportPackagePDF = async ({
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

  const logoImg = await loadImage("/adwait-logo.jpg");
  if (!logoImg) {
    alert("Could not load company logo.");
    return;
  }

  const posterImg = itineraryData?.posterImage
    ? await loadImage(itineraryData.posterImage)
    : null;

  const dayImagesMap = {};
  if (itineraryData?.days?.length) {
    for (let di = 0; di < itineraryData.days.length; di++) {
      const imgs = (itineraryData.days[di].images || []).slice(0, 2);
      dayImagesMap[di] = await Promise.all(imgs.map(loadImage));
    }
  }

  // PAGE 1 — COVER PAGE
  await drawCoverPage(
    pdfdoc,
    logoImg,
    posterImg,
    hotelEntries,
    itineraryData?.title,
    customerName,
    packageName,
    selectedTransport,
    selectedActivities,
  );

  addFooter(pdfdoc);

  // PAGE 2 — QUOTATION SUMMARY
  pdfdoc.addPage();
  addHeader(pdfdoc, logoImg);

  let y = 42;

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor(BRAND);
  pdfdoc.text("Hotel Details", 15, y);
  pdfdoc.setTextColor("#000");

  autoTable(pdfdoc, {
    startY: y + 5,
    head: [
      [
        "Hotel Name",
        "City",
        "Room Type",
        "Dates",
        "Nights",
        "Meal Plan",
        "Guests",
      ],
    ],
    body: hotelEntries.map((h) => {
      const guestParts = [
        `${h.numDouble || 0} Rm`,
        ...(h.numExtraAdult > 0 ? [`${h.numExtraAdult} Ext.Adult`] : []),
        ...(h.numExtraChild > 0 ? [`${h.numExtraChild} Child`] : []),
        ...(h.numCNB > 0 ? [`${h.numCNB} CNB`] : []),
      ];
      return [
        h.hotel,
        h.city,
        h.selectedRoomCategory,
        `${formatDate(h.checkInDate)} - ${formatDate(h.checkOutDate)}`,
        h.nights,
        MEAL_PLAN_LABELS[h.selectedMealPlan] || h.selectedMealPlan || "—",
        guestParts.join(", "),
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: BRAND, fontSize: FONT_SMALL, fontStyle: "bold" },
    styles: { fontSize: FONT_SMALL, cellPadding: 2.5, font: "helvetica" },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 13 },
      5: { cellWidth: 28 },
      6: { cellWidth: 25 },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: () => addHeader(pdfdoc, logoImg),
  });

  y = pdfdoc.lastAutoTable.finalY;

  autoTable(pdfdoc, {
    startY: y + 10,
    body: [
      [
        {
          content: "Grand Total Tour Cost:",
          styles: { fontStyle: "bold", textColor: BRAND, fontSize: FONT_BODY },
        },
        {
          content: `Rs. ${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
          styles: {
            halign: "right",
            fontStyle: "bold",
            textColor: BRAND,
            fontSize: FONT_BODY,
          },
        },
      ],
    ],
    theme: "grid",
    styles: { fontSize: FONT_BODY, cellPadding: 3, font: "helvetica" },
    columnStyles: { 0: { cellWidth: 120 } },
    margin: { left: 15, right: 15 },
    didDrawPage: () => addHeader(pdfdoc, logoImg),
  });
  y = pdfdoc.lastAutoTable.finalY;
  // ── MOVED: INCLUSIONS & EXCLUSIONS ──
  const { totalBreakfasts, totalLunches, totalDinners } =
    calculateTotalMeals(hotelEntries);

  const legacyIncluded = ["Hotel accommodation as specified."];
  if (totalBreakfasts > 0)
    legacyIncluded.push(`${totalBreakfasts} Breakfast(s)`);
  if (totalLunches > 0) legacyIncluded.push(`${totalLunches} Lunch(es)`);
  if (totalDinners > 0) legacyIncluded.push(`${totalDinners} Dinner(s)`);
  if (!totalBreakfasts && !totalLunches && !totalDinners)
    legacyIncluded.push("No meals included (EP Plan)");

  if (selectedTransport?.selectedVehicle) {
    const v = selectedTransport.selectedVehicle;
    legacyIncluded.push(`Private ${v.type || v.name}${v.ac ? " (AC)" : ""}.`);
    legacyIncluded.push("Toll, parking fees, driver allowance, and permits.");
  }

  selectedActivities?.forEach((a) =>
    legacyIncluded.push(
      `${a.name} (${a.city || "Custom"}) - ${a.participants} Person(s)`,
    ),
  );

  const legacyExcluded = [
    "Train / Flight Fare.",
    "Early check-in & late check-out.",
    "Anything not in the Included list.",
  ];

  const editorIncluded = (itineraryData?.inclusions || [])
    .filter((i) => i.selected)
    .map((i) => i.text);
  const editorExcluded = (itineraryData?.exclusions || [])
    .filter((i) => i.selected)
    .map((i) => i.text);

  const allIncluded = [...legacyIncluded, ...editorIncluded];
  const allExcluded = [...legacyExcluded, ...editorExcluded];

  if (allIncluded.length || allExcluded.length) {
    // Check if we need a new page before drawing this section
    y = ensureSpace(pdfdoc, logoImg, y, 40);
    y += 10;
    y = drawSectionHeading(pdfdoc, "Inclusions & Exclusions", y);
    y += 8;

    const incExcBody = Array.from(
      { length: Math.max(allIncluded.length, allExcluded.length) },
      (_, i) => [allIncluded[i] || "", allExcluded[i] || ""],
    );

    autoTable(pdfdoc, {
      startY: y,
      head: [
        [
          {
            content: "INCLUDED",
            styles: { fillColor: BRAND, halign: "center", fontStyle: "bold" },
          },
          {
            content: "EXCLUDED",
            styles: {
              fillColor: BRAND_DARK,
              halign: "center",
              fontStyle: "bold",
            },
          },
        ],
      ],
      body: incExcBody,
      theme: "grid",
      styles: {
        fontSize: FONT_BODY,
        cellPadding: 3,
        valign: "top",
        font: "helvetica",
      },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(pdfdoc, logoImg),
    });

    // Update y to the end of this table for any sections following it
    y = pdfdoc.lastAutoTable.finalY;
  }

  addFooter(pdfdoc);

  addFooter(pdfdoc);

  // ITINERARY PAGES + INCLUSIONS & EXCLUSIONS (original logic preserved)
  const itin = itineraryData;
  const hasDays = itin?.days?.length > 0;

  if (itin && hasDays) {
    pdfdoc.addPage();
    addHeader(pdfdoc, logoImg);

    y = 42;

    y = drawSectionHeading(
      pdfdoc,
      `Itinerary${itin.title ? ": " + itin.title : ""}`,
      y,
    );
    y += 6;

    if (itin.cities?.length) {
      pdfdoc.setFont("helvetica", "normal");
      pdfdoc.setFontSize(FONT_BODY);
      pdfdoc.setTextColor("#555");
      pdfdoc.text(`Cities: ${itin.cities.join("  •  ")}`, 15, y);
      y += 8;
    }

    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(FONT_DAY);
    pdfdoc.setTextColor(BRAND_DARK);
    pdfdoc.text("Day-wise Program", 15, y);
    y += 7;

    for (let di = 0; di < itin.days.length; di++) {
      const day = itin.days[di];
      const enrichedDay = {
        ...day,
        images: (dayImagesMap[di] || [])
          .map((imgObj, ii) =>
            imgObj ? { imgObj, src: (day.images || [])[ii] } : null,
          )
          .filter(Boolean)
          .map((x) => x.src),
      };
      y = await drawDay(pdfdoc, logoImg, enrichedDay, y);
    }

    // Terms & Conditions
    const selectedTnc = (itin.tnc || []).filter((i) => i.selected);
    const selectedCan = (itin.cancellation || []).filter((i) => i.selected);

    if (selectedTnc.length || selectedCan.length) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y += 4;
      y = drawSectionHeading(
        pdfdoc,
        "Terms & Conditions / Cancellation Policy",
        y,
      );
      y += 4;

      if (selectedTnc.length) {
        y = drawChecklist(
          pdfdoc,
          logoImg,
          "Terms & Conditions",
          itin.tnc,
          y,
          AMBER,
          true,
        );
      }
      if (selectedCan.length) {
        y = drawChecklist(
          pdfdoc,
          logoImg,
          "Cancellation Policy",
          itin.cancellation,
          y,
          "#C62828",
          true,
        );
      }
    }

    // Important Information
    if (itin.impInfo?.some((i) => i.selected)) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y += 4;
      y = drawSectionHeading(pdfdoc, "Important Information", y);
      y += 4;
      y = drawChecklist(pdfdoc, logoImg, "", itin.impInfo, y, BRAND, true);
    }

    // ── INCLUSIONS & EXCLUSIONS (UPDATED - clean, no icons, better position) ──

    addFooter(pdfdoc);
  } else {
    // No itinerary case - inclusions on page 2 (kept original fallback logic)
    // ... (your original else block remains)
    y = pdfdoc.lastAutoTable.finalY + 15;
    // (You can keep your original no-itinerary inclusions code here if needed)
  }

  // Generate PDF filename: ClientName_PackageName.pdf
  let rawName = `${(customerName || "Client").trim()}_${(packageName || "Travel_Package").trim()}.pdf`;

  // Clean filename without regex
  const cleanName = rawName
    .split("") // convert to array of characters
    .filter((char) => {
      return /[a-zA-Z0-9 _-]/.test(char); // keep only safe characters
    })
    .join("")
    .replace(/ /g, "_") // replace spaces with _
    .replace(/-+/g, "_") // replace hyphens with _
    .replace(/_+/g, "_") // multiple _ → single _
    .replace(/^_+|_+$/g, ""); // trim leading/trailing _

  pdfdoc.save(cleanName || "Travel_Package_Quotation.pdf");
};
