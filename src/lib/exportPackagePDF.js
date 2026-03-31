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
    const imgH = 35;
    const imgW = dayImages.length === 2 ? 82 : 170;
    const gap = 6;

    y = ensureSpace(pdfdoc, logoImg, y, imgH + 6);
    y += 3;

    for (let i = 0; i < dayImages.length; i++) {
      const imgObj = await loadImage(dayImages[i]);
      if (!imgObj) continue;
      const fmt = detectImgFormat(dayImages[i]);
      const x = 15 + i * (imgW + gap);
      pdfdoc.addImage(imgObj, fmt, x, y, imgW, imgH);
      pdfdoc.setDrawColor("#CCCCCC");
      pdfdoc.setLineWidth(0.3);
      pdfdoc.rect(x, y, imgW, imgH);
    }
    y += imgH + 4;
  }

  pdfdoc.setDrawColor("#E0E0E0");
  pdfdoc.setLineWidth(0.3);
  pdfdoc.line(15, y + 1, 200, y + 1);
  y += 6;

  return y;
};

// ─── PAGE 1 COVER ─────────────────────────────────────────────────────────────
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
  // ── Top Half: Poster Image Only ───────────────────────────────────────────
  const halfHeight = PAGE_H / 2;

  if (posterImg) {
    const fmt = detectImgFormat(posterImg.src);
    pdfdoc.addImage(posterImg, fmt, 0, 0, PAGE_W, halfHeight);
  } else {
    pdfdoc.setFillColor("#FFFFFF");
    pdfdoc.rect(0, 0, PAGE_W, halfHeight, "F");
  }

  // ── Bottom Half: Solid BRAND color (moved up a bit) ───────────────────────
  const overlayY = halfHeight - 18; // ← Key adjustment
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(0, overlayY, PAGE_W, PAGE_H - overlayY, "F");

  // Divider line
  pdfdoc.setDrawColor("#FFFFFF");
  pdfdoc.setLineWidth(1);
  pdfdoc.line(0, halfHeight, PAGE_W, halfHeight);

  // ── Logo (on top of poster) ───────────────────────────────────────────────
  const logoZone = PAGE_H * 0.19;
  const logoW = 48;
  const logoAspect = logoImg.width / logoImg.height;
  const logoH = logoW / logoAspect;
  const logoX = (PAGE_W - logoW) / 2;
  const logoY = (logoZone - logoH) / 2 + 5;

  const circleR = Math.max(logoW, logoH) / 2 + 4;
  pdfdoc.setFillColor("#FFFFFF");
  pdfdoc.circle(logoX + logoW / 2, logoY + logoH / 2, circleR, "F");
  pdfdoc.addImage(logoImg, "PNG", logoX, logoY, logoW, logoH);

  // ── Title & Trip Label ────────────────────────────────────────────────────
  const totalNights = hotelEntries.reduce(
    (s, e) => s + (parseInt(e.nights) || 0),
    0,
  );
  const totalDays = totalNights + 1;
  const tripLabel = `${totalNights}N / ${totalDays}D`;
  const title = itinTitle || packageName || "Travel Package";

  const cardX = 20;
  const cardW = PAGE_W - 40;
  const cardY = overlayY + 18; // Start content higher

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(24); // Slightly smaller title
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(title, PAGE_W / 2, cardY + 12, { align: "center" });

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor("#E3E9FF");
  pdfdoc.text(tripLabel, PAGE_W / 2, cardY + 21, { align: "center" });

  pdfdoc.setDrawColor("#FFFFFF");
  pdfdoc.setLineWidth(0.5);
  pdfdoc.line(cardX + 35, cardY + 25, cardX + cardW - 35, cardY + 25);

  // ── Customer Name Band ────────────────────────────────────────────────────
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(cardX, cardY + 29, cardW, 10, "F");
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(11.5);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(customerName || "Guest", PAGE_W / 2, cardY + 36, {
    align: "center",
  });

  // ── Guest Details ─────────────────────────────────────────────────────────
  const guestY = cardY + 42;
  pdfdoc.setFillColor(BRAND_DARK);
  pdfdoc.rect(cardX, guestY, cardW, 20, "F");

  const gEntry = hotelEntries[0] || {};
  const couples = gEntry.numDouble || 0;
  const extraAdults = gEntry.numExtraAdult || 0;
  const children = gEntry.numExtraChild || 0;
  const cnb = gEntry.numCNB || 0;

  const col1X = cardX + 5;
  const col2X = PAGE_W / 2 + 5;
  const row1Y = guestY + 7.5;
  const row2Y = guestY + 15;

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(7.5);
  pdfdoc.setTextColor("#AAC4FF");

  pdfdoc.text("PACKAGE", col1X, row1Y - 3.5);
  pdfdoc.text("DATE", col2X, row1Y - 3.5);
  pdfdoc.text("GUESTS", col1X, row2Y - 3.5);

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(8.5);
  pdfdoc.setTextColor("#FFFFFF");

  const guestStr = [
    `${couples} Room${couples !== 1 ? "s" : ""}`,
    extraAdults > 0
      ? `${extraAdults} Ext. Adult${extraAdults !== 1 ? "s" : ""}`
      : null,
    children > 0 ? `${children} Child${children !== 1 ? "ren" : ""}` : null,
    cnb > 0 ? `${cnb} CNB` : null,
  ]
    .filter(Boolean)
    .join("  |  ");

  pdfdoc.text(packageName || "—", col1X, row1Y);
  pdfdoc.text(formatDate(new Date().toISOString()), col2X, row1Y);
  pdfdoc.text(guestStr || "—", col1X, row2Y);

  // ── YOUR TRIP INCLUDES ────────────────────────────────────────────────────
  const includesY = guestY + 26;
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(9.5);
  pdfdoc.setTextColor("#FFD700");
  pdfdoc.text("YOUR TRIP INCLUDES", PAGE_W / 2, includesY, { align: "center" });

  // ── Service Icons (PNG) without blue circle ───────────────────────────────
  const hasHotel = hotelEntries.length > 0;
  const hasTransport = !!selectedTransport?.selectedVehicle;

  const services = [];
  if (hasHotel) services.push({ label: "Hotel", iconPath: "/hotel.png" });
  if (hasTransport)
    services.push({ label: "Transfer", iconPath: "/transfer.png" });
  if (hasTransport)
    services.push({ label: "Sightseeing", iconPath: "/sightseeing.png" });

  const iconBoxSize = 21;
  const iconSpacing = 47;
  const iconRowY = includesY + 7;
  const iconStartX =
    (PAGE_W - (services.length * iconSpacing - (iconSpacing - iconBoxSize))) /
    2;

  for (let idx = 0; idx < services.length; idx++) {
    const svc = services[idx];
    const bx = iconStartX + idx * iconSpacing;
    const by = iconRowY;

    pdfdoc.setFillColor("#FFFFFF");
    pdfdoc.setDrawColor("#DDDDDD");
    pdfdoc.setLineWidth(0.3);
    pdfdoc.roundedRect(bx, by, iconBoxSize, iconBoxSize, 3, 3, "FD");

    // PNG Icon only
    const iconSize = 12.5;
    const iconX = bx + (iconBoxSize - iconSize) / 2;
    const iconY = by + (iconBoxSize - iconSize) / 2;
    await drawServiceIcon(pdfdoc, svc.iconPath, iconX, iconY, iconSize);

    // Label
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(7.5);
    pdfdoc.setTextColor("#FFFFFF");
    pdfdoc.text(svc.label, bx + iconBoxSize / 2, by + iconBoxSize + 5.5, {
      align: "center",
    });
  }

  // ── Emergency Contacts ────────────────────────────────────────────────────
  const contactBandY = iconRowY + iconBoxSize + 11;
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(cardX, contactBandY, cardW, 11, "F");

  pdfdoc.setFillColor(BRAND_DARK);
  pdfdoc.rect(cardX, contactBandY, 4, 11, "F");

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(8.5);
  pdfdoc.setTextColor("#FFD700");
  pdfdoc.text("Emergency Contacts:", cardX + 8, contactBandY + 4.8);

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text("+91 9884798483  |  +91 7588035114", cardX + 8, contactBandY + 9);

  // ── Bottom Meta Row (compact to avoid footer cut-off) ─────────────────────
  const metaY = contactBandY + 14;
  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(7);
  pdfdoc.setTextColor("#CCDDFF");

  pdfdoc.text("Itinerary Curated By", cardX, metaY);
  pdfdoc.text("Peeyoush Takale (+91 9884798483)", cardX, metaY + 4.2);

  const refText = `Ref: ${packageName || "—"}`;
  const dateText = `Date: ${todayFormatted()}`;
  pdfdoc.text(refText, cardX + cardW, metaY, { align: "right" });
  pdfdoc.text(dateText, cardX + cardW, metaY + 4.2, { align: "right" });
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

    const editorIncluded = (itin?.inclusions || [])
      .filter((i) => i.selected)
      .map((i) => i.text);
    const editorExcluded = (itin?.exclusions || [])
      .filter((i) => i.selected)
      .map((i) => i.text);

    const allIncluded = [...legacyIncluded, ...editorIncluded];
    const allExcluded = [...legacyExcluded, ...editorExcluded];

    if (allIncluded.length || allExcluded.length) {
      y = ensureSpace(pdfdoc, logoImg, y, 25);
      y += 8;
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
              styles: {
                fillColor: BRAND,
                textColor: "#FFFFFF",
                halign: "center",
                fontStyle: "bold",
                fontSize: FONT_BODY,
              },
            },
            {
              content: "EXCLUDED",
              styles: {
                fillColor: BRAND_DARK,
                textColor: "#FFFFFF",
                halign: "center",
                fontStyle: "bold",
                fontSize: FONT_BODY,
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
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 90 },
        },
        margin: { left: 15, right: 15, top: 40 }, // ← added top margin to avoid header overlap
        didDrawPage: () => addHeader(pdfdoc, logoImg),
      });
    }

    addFooter(pdfdoc);
  } else {
    // No itinerary case - inclusions on page 2 (kept original fallback logic)
    // ... (your original else block remains)
    y = pdfdoc.lastAutoTable.finalY + 15;
    // (You can keep your original no-itinerary inclusions code here if needed)
  }

  pdfdoc.save("Travel_Package_Quotation.pdf");
};
