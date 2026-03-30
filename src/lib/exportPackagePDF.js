// src/utils/exportPackagePDF.js
// Standalone PDF export utility for travel package quotations.
// Usage: import { exportPackagePDF } from "@/utils/exportPackagePDF";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND      = "#0D47A1";
const BRAND_DARK = "#0A3880";
const AMBER      = "#E65100";
const SLATE      = "#475569";
const SLATE_LIGHT = "#94A3B8";

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm

// Consistent font sizes across the whole PDF
const FONT_BODY    = 9;
const FONT_SMALL   = 8;
const FONT_TINY    = 7;
const FONT_HEADING = 10;
const FONT_DAY     = 11; // Day-wise itinerary font size

const MEAL_PLAN_LABELS = {
  EP:  "Accommodation Only",
  CP:  "Bed & Breakfast",
  MAP: "Breakfast & Dinner",
  AP:  "All Meals Included",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const todayFormatted = () =>
  new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    .split("/").join("-");

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

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const detectImgFormat = (src) => {
  if (!src) return "JPEG";
  const lower = src.toLowerCase();
  if (lower.includes(".png")  || lower.includes("image/png"))  return "PNG";
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

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor("#444");
  pdfdoc.text("Thank you for choosing Adwait Tours!",            107, 287, { align: "center" });
  pdfdoc.text("For Reviews: Google Page | Follow Us: Instagram", 107, 291, { align: "center" });
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
const drawChecklist = (pdfdoc, logoImg, heading, items, y, dotColor = BRAND, selectedOnly = true) => {
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

// ─── Draw SVG-style icon using jsPDF primitives ───────────────────────────────
/**
 * Draws a simple icon at (x, y) with given size.
 * type: "hotel" | "car" | "binoculars"
 * color: hex string
 */
const drawIcon = (pdfdoc, type, x, y, size, color) => {
  pdfdoc.setDrawColor(color);
  pdfdoc.setFillColor(color);
  pdfdoc.setLineWidth(0.6);
  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;

  if (type === "hotel") {
    // Building outline
    const bw = s * 0.65, bh = s * 0.6;
    const bx = cx - bw / 2, by = cy - bh / 2 + s * 0.05;
    pdfdoc.rect(bx, by, bw, bh, "F");
    // Roof / triangle top
    pdfdoc.setFillColor("#FFFFFF");
    // Door cutout
    const dw = s * 0.18, dh = s * 0.22;
    pdfdoc.rect(cx - dw / 2, by + bh - dh, dw, dh, "F");
    // Window cutouts (2 small squares)
    const wsize = s * 0.1;
    pdfdoc.rect(bx + s * 0.1, by + s * 0.1, wsize, wsize, "F");
    pdfdoc.rect(bx + bw - s * 0.1 - wsize, by + s * 0.1, wsize, wsize, "F");
    pdfdoc.setFillColor(color);
    // Chimney
    pdfdoc.rect(cx + s * 0.1, by - s * 0.1, s * 0.08, s * 0.12, "F");

  } else if (type === "car") {
    // Car body bottom rectangle
    pdfdoc.setFillColor(color);
    const cw = s * 0.72, ch = s * 0.22;
    const cbx = cx - cw / 2, cby = cy + s * 0.08;
    pdfdoc.roundedRect(cbx, cby, cw, ch, 1.5, 1.5, "F");
    // Car roof (rounded top)
    const rw = s * 0.45, rh = s * 0.2;
    pdfdoc.roundedRect(cx - rw / 2, cby - rh, rw, rh + s * 0.04, 2, 2, "F");
    // Wheels
    pdfdoc.setFillColor("#FFFFFF");
    const wr = s * 0.09;
    pdfdoc.circle(cbx + s * 0.13, cby + ch, wr, "F");
    pdfdoc.circle(cbx + cw - s * 0.13, cby + ch, wr, "F");
    // Windshield cutout
    pdfdoc.setFillColor("#FFFFFF");
    pdfdoc.rect(cx - rw / 2 + s * 0.04, cby - rh + s * 0.03, rw - s * 0.08, rh - s * 0.06, "F");

  } else if (type === "binoculars") {
    // Two circles (lenses)
    pdfdoc.setFillColor(color);
    const lr = s * 0.18;
    pdfdoc.circle(cx - s * 0.18, cy + s * 0.05, lr, "F");
    pdfdoc.circle(cx + s * 0.18, cy + s * 0.05, lr, "F");
    // Bridge between circles
    pdfdoc.rect(cx - s * 0.04, cy - s * 0.04, s * 0.08, s * 0.12, "F");
    // Inner lens circles
    pdfdoc.setFillColor("#FFFFFF");
    const ilr = s * 0.1;
    pdfdoc.circle(cx - s * 0.18, cy + s * 0.05, ilr, "F");
    pdfdoc.circle(cx + s * 0.18, cy + s * 0.05, ilr, "F");
    // Top handles
    pdfdoc.setFillColor(color);
    pdfdoc.rect(cx - s * 0.28, cy - s * 0.22, s * 0.12, s * 0.2, "F");
    pdfdoc.rect(cx + s * 0.16, cy - s * 0.22, s * 0.12, s * 0.2, "F");
  }
};

// ─── Day card renderer ────────────────────────────────────────────────────────
const drawDay = async (pdfdoc, logoImg, day, y) => {
  const descLines = day.description
    ? pdfdoc.splitTextToSize(day.description, 155).length
    : 0;
  const needed = 8 + descLines * 6 + 10;

  y = ensureSpace(pdfdoc, logoImg, y, needed);

  // Day badge
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

  // Description
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

  // ── Day images (max 2, rendered side by side after description) ──────────
  const dayImages = (day.images || []).filter(Boolean).slice(0, 2);
  if (dayImages.length > 0) {
    const imgH   = 35;
    const imgW   = dayImages.length === 2 ? 82 : 170;
    const gap    = 6;

    y = ensureSpace(pdfdoc, logoImg, y, imgH + 6);
    y += 3;

    for (let i = 0; i < dayImages.length; i++) {
      const imgObj = await loadImage(dayImages[i]);
      if (!imgObj) continue;
      const fmt = detectImgFormat(dayImages[i]);
      const x   = 15 + i * (imgW + gap);
      pdfdoc.addImage(imgObj, fmt, x, y, imgW, imgH);
      pdfdoc.setDrawColor("#CCCCCC");
      pdfdoc.setLineWidth(0.3);
      pdfdoc.rect(x, y, imgW, imgH);
    }
    y += imgH + 4;
  }

  // Thin separator
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

  // ── Full-bleed poster image ──────────────────────────────────────────────
  if (posterImg) {
    const fmt = detectImgFormat(posterImg.src);
    pdfdoc.addImage(posterImg, fmt, 0, 0, PAGE_W, PAGE_H);
  } else {
    pdfdoc.setFillColor("#1a237e");
    pdfdoc.rect(0, 0, PAGE_W, PAGE_H, "F");
    pdfdoc.setFillColor("#1e2f9e");
    for (let i = 0; i < 20; i++) {
      pdfdoc.rect(0, i * 15, PAGE_W, 7, "F");
    }
  }

  // ── Semi-transparent dark overlay at bottom 52% ───────────────────────────
  const overlayH = PAGE_H * 0.52;
  const overlayY = PAGE_H - overlayH;

  try {
    pdfdoc.saveGraphicsState();
    pdfdoc.setGState(new pdfdoc.GState({ opacity: 0.62 }));
    pdfdoc.setFillColor("#000000");
    pdfdoc.rect(0, overlayY, PAGE_W, overlayH, "F");
    pdfdoc.restoreGraphicsState();
  } catch {
    pdfdoc.setFillColor("#0D1B4B");
    pdfdoc.rect(0, overlayY, PAGE_W, overlayH, "F");
  }

  // ── Logo centred at top 1/5 ───────────────────────────────────────────────
  const logoZone   = PAGE_H * 0.2;
  const logoW      = 50;
  const logoAspect = logoImg.width / logoImg.height;
  const logoH      = logoW / logoAspect;
  const logoX      = (PAGE_W - logoW) / 2;
  const logoY      = (logoZone - logoH) / 2;

  const circleR = Math.max(logoW, logoH) / 2 + 4;
  pdfdoc.setFillColor("#FFFFFF");
  try {
    pdfdoc.saveGraphicsState();
    pdfdoc.setGState(new pdfdoc.GState({ opacity: 0.9 }));
    pdfdoc.circle(logoX + logoW / 2, logoY + logoH / 2, circleR, "F");
    pdfdoc.restoreGraphicsState();
  } catch {
    pdfdoc.circle(logoX + logoW / 2, logoY + logoH / 2, circleR, "F");
  }

  pdfdoc.addImage(logoImg, "PNG", logoX, logoY, logoW, logoH);

  // ── Title & nights/days ───────────────────────────────────────────────────
  const totalNights = hotelEntries.reduce((s, e) => s + (parseInt(e.nights) || 0), 0);
  const totalDays   = totalNights + 1;
  const tripLabel   = `${totalNights}N / ${totalDays}D`;
  const title       = itinTitle || packageName || "Travel Package";

  const cardX = 20;
  const cardW = PAGE_W - 40;
  const cardY = overlayY + 6;

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(26);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(title, PAGE_W / 2, cardY + 13, { align: "center" });

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(12);
  pdfdoc.setTextColor("#E3E9FF");
  pdfdoc.text(tripLabel, PAGE_W / 2, cardY + 22, { align: "center" });

  pdfdoc.setDrawColor("#FFFFFF");
  pdfdoc.setLineWidth(0.5);
  pdfdoc.line(cardX + 30, cardY + 26, cardX + cardW - 30, cardY + 26);

  // ── Customer name band ────────────────────────────────────────────────────
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(cardX, cardY + 29, cardW, 11, "F");
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(12);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(customerName || "Guest", PAGE_W / 2, cardY + 36.5, { align: "center" });

  // ── Guest details row (moved from page 2) ─────────────────────────────────
  const guestY = cardY + 45;
  pdfdoc.setFillColor(BRAND_DARK);
  pdfdoc.rect(cardX, guestY, cardW, 22, "F");

  const gEntry = hotelEntries[0] || {};
  const couples     = gEntry.numDouble     || 0;
  const extraAdults = gEntry.numExtraAdult || 0;
  const children    = gEntry.numExtraChild || 0;
  const cnb         = gEntry.numCNB        || 0;

  const col1X = cardX + 5;
  const col2X = PAGE_W / 2 + 5;
  const row1Y = guestY + 8;
  const row2Y = guestY + 16;

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(FONT_TINY);
  pdfdoc.setTextColor("#AAC4FF");

  pdfdoc.text("PACKAGE",    col1X,  row1Y - 4.5);
  pdfdoc.text("DATE",       col2X,  row1Y - 4.5);
  pdfdoc.text("GUESTS",     col1X,  row2Y - 4.5);

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(FONT_BODY);
  pdfdoc.setTextColor("#FFFFFF");

  const guestStr = [
    `${couples} Room${couples !== 1 ? "s" : ""}`,
    extraAdults > 0 ? `${extraAdults} Ext. Adult${extraAdults !== 1 ? "s" : ""}` : null,
    children > 0    ? `${children} Child${children !== 1 ? "ren" : ""}` : null,
    cnb > 0         ? `${cnb} CNB` : null,
  ].filter(Boolean).join("  |  ");

  pdfdoc.text(packageName || "—", col1X, row1Y);
  pdfdoc.text(formatDate(new Date().toISOString()), col2X, row1Y);
  pdfdoc.text(guestStr || "—", col1X, row2Y);

  // ── "Your Trip Includes" label ─────────────────────────────────────────────
  const includesY = guestY + 28;
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(FONT_BODY);
  pdfdoc.setTextColor("#FFD700");
  pdfdoc.text("YOUR TRIP INCLUDES", PAGE_W / 2, includesY, { align: "center" });

  // ── Service icons row ──────────────────────────────────────────────────────
  const hasHotel       = hotelEntries.length > 0;
  const hasTransport   = !!selectedTransport?.selectedVehicle;
  const hasSightseeing = hasHotel;

  const services = [];
  if (hasHotel)       services.push({ label: "Hotel",       iconType: "hotel" });
  if (hasTransport)   services.push({ label: "Transfer",    iconType: "car" });
  if (hasSightseeing) services.push({ label: "Sightseeing", iconType: "binoculars" });

  const iconBoxSize = 22;
  const iconSpacing = 48;
  const iconRowY    = includesY + 5;
  const iconStartX  = (PAGE_W - (services.length * iconSpacing - (iconSpacing - iconBoxSize))) / 2;

  services.forEach((svc, idx) => {
    const bx = iconStartX + idx * iconSpacing;
    const by = iconRowY;

    // White rounded box
    pdfdoc.setFillColor("#FFFFFF");
    pdfdoc.setDrawColor("#DDDDDD");
    pdfdoc.setLineWidth(0.3);
    pdfdoc.roundedRect(bx, by, iconBoxSize, iconBoxSize, 3, 3, "FD");

    // Checkmark badge top-right (solid blue circle)
    pdfdoc.setFillColor(BRAND);
    pdfdoc.circle(bx + iconBoxSize - 3, by + 3, 3, "F");
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(5);
    pdfdoc.setTextColor("#FFFFFF");
    pdfdoc.text("✓", bx + iconBoxSize - 4.8, by + 4.5);

    // Draw primitive icon centered in box
    const iconSize = 13;
    const iconX = bx + (iconBoxSize - iconSize) / 2;
    const iconY = by + (iconBoxSize - iconSize) / 2;
    drawIcon(pdfdoc, svc.iconType, iconX, iconY, iconSize, BRAND);

    // Label below icon box
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(FONT_TINY);
    pdfdoc.setTextColor("#FFFFFF");
    pdfdoc.text(svc.label, bx + iconBoxSize / 2, by + iconBoxSize + 5, { align: "center" });
  });

  // ── Emergency Contacts — SOLID theme color, no transparency ───────────────
  const contactBandY = iconRowY + iconBoxSize + 11;
  // Solid band — no opacity tricks
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(cardX, contactBandY, cardW, 12, "F");

  // Left accent strip
  pdfdoc.setFillColor(BRAND_DARK);
  pdfdoc.rect(cardX, contactBandY, 4, 12, "F");

  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor("#FFD700");
  pdfdoc.text("Emergency Contacts:", cardX + 8, contactBandY + 5);

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text("+91 9884798483  |  +91 7588035114", cardX + 8, contactBandY + 9.5);

  // ── Bottom meta row ────────────────────────────────────────────────────────
  const metaY = contactBandY + 17;
  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(FONT_TINY);
  pdfdoc.setTextColor("#CCDDFF");

  pdfdoc.text("Itinerary Curated By",              cardX,          metaY);
  pdfdoc.text("Peeyoush Takale ( +91 9884798483 )", cardX,          metaY + 5);

  const refText  = `Ref: ${packageName || "—"}`;
  const dateText = `Date: ${todayFormatted()}`;
  pdfdoc.text(refText,  cardX + cardW, metaY,     { align: "right" });
  pdfdoc.text(dateText, cardX + cardW, metaY + 5, { align: "right" });
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

  // ── Pre-load all images concurrently ────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER PAGE (poster + info card)
  // ═══════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2 — QUOTATION SUMMARY (no customer meta — moved to page 1)
  // ═══════════════════════════════════════════════════════════════════════
  pdfdoc.addPage();
  addHeader(pdfdoc, logoImg);

  // ── Hotel details ────────────────────────────────────────────────────────
  let y = 42;
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(11);
  pdfdoc.setTextColor(BRAND);
  pdfdoc.text("Hotel Details", 15, y);
  pdfdoc.setTextColor("#000");

  autoTable(pdfdoc, {
    startY: y + 5,
    head: [["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan", "Guests"]],
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

  // ── Grand total ──────────────────────────────────────────────────────────
  y = pdfdoc.lastAutoTable.finalY;
  autoTable(pdfdoc, {
    startY: y + 10,
    body: [[
      {
        content: "Grand Total Tour Cost:",
        styles: { fontStyle: "bold", textColor: BRAND, fontSize: FONT_BODY },
      },
      {
        content: `Rs. ${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
        styles: { halign: "right", fontStyle: "bold", textColor: BRAND, fontSize: FONT_BODY },
      },
    ]],
    theme: "grid",
    styles: { fontSize: FONT_BODY, cellPadding: 3, font: "helvetica" },
    columnStyles: { 0: { cellWidth: 120 } },
    margin: { left: 15, right: 15 },
    didDrawPage: () => addHeader(pdfdoc, logoImg),
  });

  addFooter(pdfdoc);

  // ═══════════════════════════════════════════════════════════════════════
  // ITINERARY PAGES
  // ═══════════════════════════════════════════════════════════════════════
  const itin    = itineraryData;
  const hasDays = itin?.days?.length > 0;

  if (itin && hasDays) {
    pdfdoc.addPage();
    addHeader(pdfdoc, logoImg);

    y = 42;

    // ── Itinerary title banner ─────────────────────────────────────────────
    y = drawSectionHeading(
      pdfdoc,
      `Itinerary${itin.title ? ": " + itin.title : ""}`,
      y,
    );
    y += 6;

    // ── Cities row ────────────────────────────────────────────────────────
    if (itin.cities?.length) {
      pdfdoc.setFont("helvetica", "normal");
      pdfdoc.setFontSize(FONT_BODY);
      pdfdoc.setTextColor("#555");
      pdfdoc.text(`Cities: ${itin.cities.join("  •  ")}`, 15, y);
      y += 8;
    }

    // ── Day-wise program heading ──────────────────────────────────────────
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
          .map((imgObj, ii) => imgObj ? { imgObj, src: (day.images || [])[ii] } : null)
          .filter(Boolean)
          .map(x => x.src),
      };
      y = await drawDay(pdfdoc, logoImg, enrichedDay, y);
    }

    // ── Terms & Conditions (BEFORE inclusions/exclusions) ─────────────────
    const selectedTnc = (itin.tnc || []).filter((i) => i.selected);
    const selectedCan = (itin.cancellation || []).filter((i) => i.selected);

    if (selectedTnc.length || selectedCan.length) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y += 4;
      y = drawSectionHeading(pdfdoc, "Terms & Conditions / Cancellation Policy", y);
      y += 4;

      if (selectedTnc.length) {
        y = drawChecklist(pdfdoc, logoImg, "Terms & Conditions", itin.tnc, y, AMBER, true);
      }
      if (selectedCan.length) {
        y = drawChecklist(pdfdoc, logoImg, "Cancellation Policy", itin.cancellation, y, "#C62828", true);
      }
    }

    // ── Important Information ──────────────────────────────────────────────
    if (itin.impInfo?.some((i) => i.selected)) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y += 4;
      y = drawSectionHeading(pdfdoc, "Important Information", y);
      y += 4;
      y = drawChecklist(pdfdoc, logoImg, "", itin.impInfo, y, BRAND, true);
    }

    // ═════════════════════════════════════════════════════════════════════
    // INCLUSIONS & EXCLUSIONS — after T&C (uniform dark color, no green/red)
    // ═════════════════════════════════════════════════════════════════════
    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(hotelEntries);

    const legacyIncluded = ["Hotel accommodation as specified."];
    if (totalBreakfasts > 0) legacyIncluded.push(`${totalBreakfasts} Breakfast(s)`);
    if (totalLunches > 0)    legacyIncluded.push(`${totalLunches} Lunch(es)`);
    if (totalDinners > 0)    legacyIncluded.push(`${totalDinners} Dinner(s)`);
    if (!totalBreakfasts && !totalLunches && !totalDinners)
      legacyIncluded.push("No meals included (EP Plan)");

    if (selectedTransport?.selectedVehicle) {
      const v = selectedTransport.selectedVehicle;
      legacyIncluded.push(`Private ${v.type || v.name}${v.ac ? " (AC)" : ""}.`);
      legacyIncluded.push("Toll, parking fees, driver allowance, and permits.");
    }

    selectedActivities?.forEach((a) =>
      legacyIncluded.push(`${a.name} (${a.city || "Custom"}) - ${a.participants} Person(s)`)
    );

    const legacyExcluded = [
      "Train / Flight Fare.",
      "Early check-in & late check-out.",
      "Anything not in the Included list.",
    ];

    const editorIncluded = (itin?.inclusions || []).filter(i => i.selected).map(i => i.text);
    const editorExcluded = (itin?.exclusions || []).filter(i => i.selected).map(i => i.text);

    const allIncluded = [...legacyIncluded, ...editorIncluded];
    const allExcluded = [...legacyExcluded, ...editorExcluded];

    if (allIncluded.length || allExcluded.length) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y += 4;
      y = drawSectionHeading(pdfdoc, "Inclusions & Exclusions", y);
      y += 4;

      const incExcBody = Array.from(
        { length: Math.max(allIncluded.length, allExcluded.length) },
        (_, i) => [
          allIncluded[i]
            ? {
                content: `✓  ${allIncluded[i]}`,
                styles: {
                  textColor: "#1A1A2E",
                  fontSize: FONT_BODY,
                  font: "helvetica",
                },
              }
            : { content: "", styles: {} },
          allExcluded[i]
            ? {
                content: `✗  ${allExcluded[i]}`,
                styles: {
                  textColor: "#1A1A2E",
                  fontSize: FONT_BODY,
                  font: "helvetica",
                },
              }
            : { content: "", styles: {} },
        ]
      );

      autoTable(pdfdoc, {
        startY: y,
        head: [[
          {
            content: "✓  INCLUDED",
            styles: {
              fillColor: BRAND,
              textColor: "#FFFFFF",
              halign: "center",
              fontStyle: "bold",
              fontSize: FONT_BODY,
              font: "helvetica",
            },
          },
          {
            content: "✗  EXCLUDED",
            styles: {
              fillColor: BRAND_DARK,
              textColor: "#FFFFFF",
              halign: "center",
              fontStyle: "bold",
              fontSize: FONT_BODY,
              font: "helvetica",
            },
          },
        ]],
        body: incExcBody,
        theme: "grid",
        styles: {
          fontSize: FONT_BODY,
          cellPadding: 2.5,
          valign: "top",
          font: "helvetica",
          textColor: "#1A1A2E",
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 90 },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: () => addHeader(pdfdoc, logoImg),
      });

      y = pdfdoc.lastAutoTable.finalY + 6;
    }

    // footer on last itinerary page
    addFooter(pdfdoc);
  } else {
    // No itinerary — still render inclusions/exclusions on page 2 after grand total
    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(hotelEntries);

    const legacyIncluded = ["Hotel accommodation as specified."];
    if (totalBreakfasts > 0) legacyIncluded.push(`${totalBreakfasts} Breakfast(s)`);
    if (totalLunches > 0)    legacyIncluded.push(`${totalLunches} Lunch(es)`);
    if (totalDinners > 0)    legacyIncluded.push(`${totalDinners} Dinner(s)`);
    if (!totalBreakfasts && !totalLunches && !totalDinners)
      legacyIncluded.push("No meals included (EP Plan)");

    if (selectedTransport?.selectedVehicle) {
      const v = selectedTransport.selectedVehicle;
      legacyIncluded.push(`Private ${v.type || v.name}${v.ac ? " (AC)" : ""}.`);
      legacyIncluded.push("Toll, parking fees, driver allowance, and permits.");
    }

    selectedActivities?.forEach((a) =>
      legacyIncluded.push(`${a.name} (${a.city || "Custom"}) - ${a.participants} Person(s)`)
    );

    const legacyExcluded = [
      "Train / Flight Fare.",
      "Early check-in & late check-out.",
      "Anything not in the Included list.",
    ];

    y = pdfdoc.lastAutoTable.finalY + 12;
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(11);
    pdfdoc.setTextColor(BRAND);
    pdfdoc.text("Inclusions & Exclusions", 15, y);
    pdfdoc.setTextColor("#000");

    const incExcBody = Array.from(
      { length: Math.max(legacyIncluded.length, legacyExcluded.length) },
      (_, i) => [
        legacyIncluded[i]
          ? {
              content: `✓  ${legacyIncluded[i]}`,
              styles: { textColor: "#1A1A2E", fontSize: FONT_BODY, font: "helvetica" },
            }
          : { content: "", styles: {} },
        legacyExcluded[i]
          ? {
              content: `✗  ${legacyExcluded[i]}`,
              styles: { textColor: "#1A1A2E", fontSize: FONT_BODY, font: "helvetica" },
            }
          : { content: "", styles: {} },
      ]
    );

    autoTable(pdfdoc, {
      startY: y + 5,
      head: [[
        {
          content: "✓  INCLUDED",
          styles: {
            fillColor: BRAND,
            textColor: "#FFFFFF",
            halign: "center",
            fontStyle: "bold",
            fontSize: FONT_BODY,
          },
        },
        {
          content: "✗  EXCLUDED",
          styles: {
            fillColor: BRAND_DARK,
            textColor: "#FFFFFF",
            halign: "center",
            fontStyle: "bold",
            fontSize: FONT_BODY,
          },
        },
      ]],
      body: incExcBody,
      theme: "grid",
      styles: {
        fontSize: FONT_BODY,
        cellPadding: 2.5,
        valign: "top",
        font: "helvetica",
        textColor: "#1A1A2E",
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 },
      },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(pdfdoc, logoImg),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════
  pdfdoc.save("Travel_Package_Quotation.pdf");
};