// src/utils/exportPackagePDF.js
// Updated with your requested changes only

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";
import { resolveOptionMarkup } from "@/lib/copyPackageSummary";
import { getQuotationDuration } from "@/lib/quotationDuration";
// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND = "#0D47A1";
const BRAND_DARK = "#0A3880";
const AMBER = "#E65100";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";

const PAGE_W = 210;
const PAGE_H = 297;

const FONT_BODY = 10;     // was 9 — body, descriptions, table rows
const FONT_SMALL = 9;     // was 8 — footer, contact info, captions
const FONT_TINY = 7;      // unchanged — only used on small frame-pill labels
const FONT_HEADING = 13;  // was 10 — sharper contrast vs body
const FONT_DAY = 13;      // was 12 — parity with section heading

const MEAL_PLAN_LABELS = {
  EP: "Accommodation Only",
  CP: "Bed & Breakfast",
  MAP: "Breakfast & Dinner",
  AP: "All Meals Included",
};

// ─── Custom font loader (graceful fallback to Helvetica) ─────────────────────
// To use a richer typeface, drop these two TTFs into /public/fonts/:
//   Inter-Regular.ttf
//   Inter-Bold.ttf
// They'll be auto-loaded on the next export. If the files are missing,
// PDF generation still works — it just falls back to Helvetica silently.
let FONT_FAMILY = "helvetica";
const tryLoadFont = async (pdfdoc, url, fontName, style) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    const filename = `${fontName}-${style}.ttf`;
    pdfdoc.addFileToVFS(filename, base64);
    pdfdoc.addFont(filename, fontName, style);
    return true;
  } catch {
    return false;
  }
};
const installCustomFonts = async (pdfdoc) => {
  const okR = await tryLoadFont(pdfdoc, "/fonts/Inter-Regular.ttf", "Inter", "normal");
  const okB = await tryLoadFont(pdfdoc, "/fonts/Inter-Bold.ttf", "Inter", "bold");
  if (okR && okB) FONT_FAMILY = "Inter";
};

// ─── Framed section helper ───────────────────────────────────────────────────
// Wraps a section with a thin rounded outer border + uppercase tracking-wider
// label at top-left. Returns the inner Y where the section's content begins.
// The caller passes the section's full *outer* height so the border encloses
// all child rendering.
const drawFramedSection = (pdfdoc, label, y, height) => {
  pdfdoc.setDrawColor("#E2E8F0"); // slate-200
  pdfdoc.setLineWidth(0.3);
  pdfdoc.roundedRect(15, y, 180, height, 2, 2, "S");

  // Label pill on the top border
  const labelText = (label || "").toUpperCase();
  pdfdoc.setFont(FONT_FAMILY, "bold");
  pdfdoc.setFontSize(FONT_TINY);
  const tw = pdfdoc.getTextWidth(labelText);
  pdfdoc.setFillColor("#FFFFFF");
  pdfdoc.rect(19, y - 1.5, tw + 4, 3, "F");
  pdfdoc.setTextColor(SLATE);
  pdfdoc.text(labelText, 21, y + 0.5);
  pdfdoc.setTextColor("#000000");

  return y + 6; // content starts 6mm below top border
};

// ─── Tiny inline icons drawn with jsPDF primitives (no PNG assets) ───────────
// All icons render at a 4x4mm box at (x, y) top-left, in the given color.
const Icon = {
  calendar(pdfdoc, x, y, color = SLATE) {
    pdfdoc.setDrawColor(color);
    pdfdoc.setLineWidth(0.3);
    pdfdoc.roundedRect(x + 0.3, y + 0.7, 3.4, 3, 0.4, 0.4, "S");
    pdfdoc.line(x + 0.3, y + 1.7, x + 3.7, y + 1.7);
    pdfdoc.line(x + 1, y + 0.3, x + 1, y + 1);
    pdfdoc.line(x + 3, y + 0.3, x + 3, y + 1);
  },
  hotel(pdfdoc, x, y, color = SLATE) {
    pdfdoc.setDrawColor(color);
    pdfdoc.setFillColor(color);
    pdfdoc.setLineWidth(0.3);
    pdfdoc.rect(x + 0.4, y + 0.5, 3.2, 3, "S");
    // tiny windows
    pdfdoc.rect(x + 1, y + 1.1, 0.6, 0.6, "F");
    pdfdoc.rect(x + 2.4, y + 1.1, 0.6, 0.6, "F");
    pdfdoc.rect(x + 1, y + 2.2, 0.6, 0.6, "F");
    pdfdoc.rect(x + 2.4, y + 2.2, 0.6, 0.6, "F");
  },
  bus(pdfdoc, x, y, color = SLATE) {
    pdfdoc.setDrawColor(color);
    pdfdoc.setLineWidth(0.3);
    pdfdoc.roundedRect(x + 0.3, y + 0.8, 3.4, 2.4, 0.4, 0.4, "S");
    pdfdoc.line(x + 0.3, y + 2, x + 3.7, y + 2);
    pdfdoc.circle(x + 1.1, y + 3.3, 0.35, "F");
    pdfdoc.circle(x + 2.9, y + 3.3, 0.35, "F");
  },
  sparkle(pdfdoc, x, y, color = BRAND) {
    pdfdoc.setDrawColor(color);
    pdfdoc.setLineWidth(0.4);
    pdfdoc.line(x + 2, y + 0.3, x + 2, y + 3.7);
    pdfdoc.line(x + 0.3, y + 2, x + 3.7, y + 2);
    pdfdoc.line(x + 0.7, y + 0.7, x + 3.3, y + 3.3);
    pdfdoc.line(x + 3.3, y + 0.7, x + 0.7, y + 3.3);
  },
  pin(pdfdoc, x, y, color = SLATE) {
    pdfdoc.setDrawColor(color);
    pdfdoc.setFillColor(color);
    pdfdoc.setLineWidth(0.3);
    pdfdoc.circle(x + 2, y + 1.6, 1.2, "S");
    pdfdoc.circle(x + 2, y + 1.6, 0.4, "F");
    pdfdoc.line(x + 2, y + 2.8, x + 2, y + 3.7);
  },
  // Filled circle with white checkmark inside — for "included" lines.
  check(pdfdoc, x, y, color = "#10B981") {
    pdfdoc.setFillColor(color);
    pdfdoc.circle(x + 2, y + 2, 1.6, "F");
    pdfdoc.setDrawColor("#FFFFFF");
    pdfdoc.setLineWidth(0.4);
    pdfdoc.line(x + 1.2, y + 2.05, x + 1.85, y + 2.65);
    pdfdoc.line(x + 1.85, y + 2.65, x + 2.85, y + 1.35);
  },
  // Filled circle with white X inside — for "excluded" lines.
  cross(pdfdoc, x, y, color = "#DC2626") {
    pdfdoc.setFillColor(color);
    pdfdoc.circle(x + 2, y + 2, 1.6, "F");
    pdfdoc.setDrawColor("#FFFFFF");
    pdfdoc.setLineWidth(0.4);
    pdfdoc.line(x + 1.2, y + 1.2, x + 2.8, y + 2.8);
    pdfdoc.line(x + 2.8, y + 1.2, x + 1.2, y + 2.8);
  },
};

// ─── Decorative section divider ───────────────────────────────────────────────
// Tapered line + small brand-color diamond in the middle, used to separate
// major sections without the heaviness of a hard rule.
const drawDecorativeDivider = (pdfdoc, y) => {
  const midX = PAGE_W / 2;
  pdfdoc.setDrawColor("#CBD5E1"); // slate-300
  pdfdoc.setLineWidth(0.4);
  pdfdoc.line(30, y, midX - 6, y);
  pdfdoc.line(midX + 6, y, PAGE_W - 30, y);
  // Diamond marker
  pdfdoc.setFillColor(BRAND);
  pdfdoc.triangle(midX, y - 2, midX - 2, y, midX + 2, y, "F");
  pdfdoc.triangle(midX, y + 2, midX - 2, y, midX + 2, y, "F");
  return y + 4;
};

// ─── Pricing summary card ────────────────────────────────────────────────────
// Tinted bordered box with a brand-colored left stripe and the grand total
// in large brand-dark type on the right. Designed to be drawn right after
// the breakdown autoTable so the final price reads as a self-contained card.
const drawPricingSummaryCard = (pdfdoc, label, amount, y) => {
  const cardH = 16;
  pdfdoc.setFillColor("#F8FAFC"); // slate-50
  pdfdoc.setDrawColor("#E2E8F0"); // slate-200
  pdfdoc.setLineWidth(0.3);
  pdfdoc.roundedRect(15, y, 180, cardH, 2, 2, "FD");
  // Left brand stripe
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(15, y, 2.5, cardH, "F");
  // Label (left)
  pdfdoc.setFont(FONT_FAMILY, "bold");
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor(SLATE);
  pdfdoc.text((label || "").toUpperCase(), 22, y + 6.5);
  pdfdoc.setFont(FONT_FAMILY, "bold");
  pdfdoc.setFontSize(FONT_HEADING + 2);
  pdfdoc.setTextColor(BRAND_DARK);
  pdfdoc.text(`Rs. ${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`, 22, y + 12.5);
  pdfdoc.setTextColor("#000000");
  return y + cardH + 4;
};

// ─── Multi-room helpers ───────────────────────────────────────────────────────
/**
 * Resolve the total price for a hotel entry from multi-room-categories or legacy flat field.
 */
const resolveEntryTotal = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return entry.roomCategories.reduce((s, rc) => s + Number(rc.price || 0), 0);
  }
  return Number(entry.hotelTotal || 0);
};

const getPrimaryMealPlan = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return entry.roomCategories[0]?.mealPlan || entry.selectedMealPlan || "";
  }
  return entry.selectedMealPlan || entry.mealPlan || "";
};

const getPrimaryRoomCategory = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return (
      entry.roomCategories[0]?.roomCategory || entry.selectedRoomCategory || ""
    );
  }
  return entry.selectedRoomCategory || entry.roomCategory || "";
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
  entries?.forEach((entry) => {
    const n = parseInt(entry.nights, 10);
    if (isNaN(n)) return;
    const plans =
      Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0
        ? [
            ...new Set(
              entry.roomCategories.map((rc) => rc.mealPlan).filter(Boolean),
            ),
          ]
        : [getPrimaryMealPlan(entry)].filter(Boolean);
    plans.forEach((mp) => {
      if (mp === "CP") {
        totalBreakfasts += n;
      }
      if (mp === "MAP") {
        totalBreakfasts += n;
        totalDinners += n;
      }
      if (mp === "AP") {
        totalBreakfasts += n;
        totalLunches += n;
        totalDinners += n;
      }
    });
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
// ─── Header / Footer ─────────────────────────────────────────────────────────
const addHeader = (pdfdoc, img) => {
  // 1. Logo Scaling (Cap height to 16 to prevent layout break, adjust width proportionally)
  const maxLogoHeight = 16;
  let lh = maxLogoHeight;
  let lw = (img.width * lh) / img.height;

  // If logo is exceptionally wide, cap width and recalculate height
  if (lw > 45) {
    lw = 45;
    lh = (img.height * lw) / img.width;
  }

  // 2. Draw Logo
  // Vertically center the logo within the 16px header band
  const logoY = 10 + (maxLogoHeight - lh) / 2;
  pdfdoc.addImage(img, "PNG", 15, logoY, lw, lh);

  // 3. Company Title & Subtitle (Positioned dynamically next to logo)
  const textStartX = 15 + lw + 8;
  pdfdoc.setFont("helvetica", "bold");
  pdfdoc.setFontSize(16);
  pdfdoc.setTextColor(BRAND);
  pdfdoc.text("Adwait Tours", textStartX, 16);

  pdfdoc.setFont("helvetica", "normal");
  pdfdoc.setFontSize(FONT_BODY);
  pdfdoc.setTextColor(SLATE);
  pdfdoc.text("Travel Package Quotation", textStartX, 22);

  // 4. Contact Information (Right-aligned perfectly against the right margin)
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor(SLATE);
  pdfdoc.text("Phone: +91 9884798483", 195, 14, { align: "right" });
  pdfdoc.text("Email: sales@adwaittours.com", 195, 19, { align: "right" });
  pdfdoc.text("Web: www.adwaittours.com", 195, 24, { align: "right" });

  // 5. Decorative Divider Line (Using Brand color for premium feel)
  pdfdoc.setDrawColor(BRAND);
  pdfdoc.setLineWidth(0.4);
  pdfdoc.line(15, 30, 195, 30);
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
  pdfdoc.setFont(FONT_FAMILY, "bold");
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

  // Small filled bullet dot, color-matched to the section heading.
  const textX = 22;
  const maxW = 175;
  filtered.forEach((item) => {
    y = ensureSpace(pdfdoc, logoImg, y, 8);
    const lines = pdfdoc.splitTextToSize(item.text, maxW);
    pdfdoc.setFillColor(dotColor);
    pdfdoc.circle(18, y - 1.4, 0.9, "F");
    pdfdoc.text(lines, textX, y);
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

// ─── Day card renderer (two-column card) ──────────────────────────────────────
// Layout (mm):
//   [15 ─── 38] vertical accent stripe + "DAY N" badge
//   [40 ─── 195] title, description, image strip
// The card has a soft slate background and a brand-colored left stripe.
const drawDay = async (pdfdoc, logoImg, day, y) => {
  const innerContentLeft = 42;
  const innerContentW = 153; // 195 - 42

  const descLines = day.description
    ? pdfdoc.splitTextToSize(day.description, innerContentW)
    : [];
  const titleLines = day.title
    ? pdfdoc.splitTextToSize(day.title, innerContentW)
    : [];

  const dayImages = (day.images || []).filter(Boolean).slice(0, 2);
  const imageStripH = dayImages.length > 0 ? 45 + 6 : 0;

  const textBlockH =
    titleLines.length * 5 + 2 + descLines.length * 5 + (descLines.length ? 4 : 0);

  const cardH = Math.max(28, 8 + textBlockH + imageStripH + 4);

  y = ensureSpace(pdfdoc, logoImg, y, cardH + 6);

  // Card background
  pdfdoc.setFillColor("#F8FAFC"); // slate-50
  pdfdoc.setDrawColor("#E2E8F0"); // slate-200
  pdfdoc.setLineWidth(0.3);
  pdfdoc.roundedRect(15, y, 180, cardH, 2, 2, "FD");

  // Left accent stripe
  pdfdoc.setFillColor(BRAND);
  pdfdoc.rect(15, y, 2.2, cardH, "F");

  // DAY N badge (left column, vertically anchored near top)
  pdfdoc.setFillColor(BRAND);
  pdfdoc.roundedRect(19, y + 3.5, 19, 6, 1, 1, "F");
  pdfdoc.setFont(FONT_FAMILY, "bold");
  pdfdoc.setFontSize(FONT_SMALL);
  pdfdoc.setTextColor("#FFFFFF");
  pdfdoc.text(`DAY ${day.dayNumber}`, 28.5, y + 7.5, { align: "center" });

  // Inline calendar icon below the day badge (decorative)
  Icon.calendar(pdfdoc, 27, y + 12, SLATE_LIGHT);

  // ── Right column: title + description ──
  let textY = y + 5;
  if (day.title) {
    pdfdoc.setFont(FONT_FAMILY, "bold");
    pdfdoc.setFontSize(FONT_HEADING);
    pdfdoc.setTextColor(BRAND_DARK);
    titleLines.forEach((line) => {
      pdfdoc.text(line, innerContentLeft, textY);
      textY += 5;
    });
    textY += 1;
  }

  if (descLines.length > 0) {
    pdfdoc.setFont(FONT_FAMILY, "normal");
    pdfdoc.setFontSize(FONT_BODY);
    pdfdoc.setTextColor("#334155"); // slate-700
    descLines.forEach((line) => {
      pdfdoc.text(line, innerContentLeft, textY);
      textY += 5;
    });
    textY += 3;
  }

  // ── Image strip (full width below text) ──
  if (dayImages.length > 0) {
    const boxH = 45;
    const stripW = 180 - 6 * 2; // card width minus internal padding
    const boxW = dayImages.length === 2 ? (stripW - 6) / 2 : stripW;
    const gap = 6;

    for (let i = 0; i < dayImages.length; i++) {
      const imgObj = await loadImage(dayImages[i]);
      if (!imgObj) continue;
      const fmt = detectImgFormat(dayImages[i]);
      const baseX = 15 + 6 + i * (boxW + gap);

      const imgAspect = imgObj.width / imgObj.height;
      const boxAspect = boxW / boxH;
      let renderW, renderH;
      if (imgAspect > boxAspect) {
        renderW = boxW;
        renderH = boxW / imgAspect;
      } else {
        renderH = boxH;
        renderW = boxH * imgAspect;
      }
      const imgX = baseX + (boxW - renderW) / 2;
      const imgY = textY + (boxH - renderH) / 2;
      pdfdoc.addImage(imgObj, fmt, imgX, imgY, renderW, renderH);
    }
    textY += boxH + 2;
  }

  pdfdoc.setTextColor("#000000");
  return y + cardH + 5;
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
  refNumber = null,
  durationLabel = null,
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
  const tripLabel = durationLabel || "0 Nights / 1 Day";

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
  pdfdoc.text(refNumber || "Q-N/A", cardX + cardW - 30, currentY, {
    align: "center",
  });

  // 6. Centered Inclusion Icons
  currentY += 20;

  pdfdoc.setFontSize(14);
  pdfdoc.text("WHAT'S INCLUDED", PAGE_W / 2, currentY, { align: "center" });

  const services = [];

  // 🏨 Hotels
  if (hotelEntries.length > 0) {
    services.push({ label: "Hotels", path: "/hotel.png" });

    const hasMeals = hotelEntries.some(
      (h) => h.selectedMealPlan && h.selectedMealPlan !== "EP",
    );
    if (hasMeals) {
      services.push({ label: "Meals", path: "/meals.png" });
    }
  }

  // 🚗 Transfers
  if (selectedTransport) {
    services.push({ label: "Transfers", path: "/transfer.png" });
  }

  // 👀 Sightseeing (ONLY ONCE if either condition is true)
  const hasSightseeing =
    selectedTransport || (selectedActivities && selectedActivities.length > 0);

  if (hasSightseeing) {
    services.push({ label: "Sightseeing", path: "/sightseeing.png" });
  }

  const iconSize = 14;
  const spacing = 35;
  const startX =
    (PAGE_W - services.length * spacing) / 2 + spacing / 2 - iconSize / 2;

  for (let i = 0; i < services.length; i++) {
    const x = startX + i * spacing;
    const y = currentY + 6;

    await drawServiceIcon(pdfdoc, services[i].path, x, y, iconSize);

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
  // new multi-option
  packageOptions,
  transportTotalPrice = 0,
  activityTotalPrice = 0,
  confirmedMarkup = 0,
  markupType = "lumpsum", // Add this parameter
  markupAmount = 0,
  // legacy single-option (kept for compat)
  hotelEntries,
  selectedTransport,
  selectedActivities,
  customerName,
  packageName,
  itineraryData = null,
  refNumber = null,
  appliedDiscount = null,
}) => {
  const allHotelEntries = packageOptions?.length
    ? packageOptions.flatMap((o) => o.hotelEntries || [])
    : hotelEntries || [];
  const duration = getQuotationDuration({ packageOptions, hotelEntries });

  if (!allHotelEntries.length) {
    alert("Add at least one hotel before exporting.");
    return;
  }

  const pdfdoc = new jsPDF();

  // Best-effort: register Inter as the document font. Silently no-ops if the
  // TTFs aren't present in /public/fonts/ — Helvetica remains the fallback.
  await installCustomFonts(pdfdoc);

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
    allHotelEntries,
    itineraryData?.title,
    customerName,
    packageName,
    selectedTransport,
    selectedActivities,
    refNumber,
    duration.label,
  );

  addFooter(pdfdoc);

  // PAGE 2 — QUOTATION SUMMARY
  pdfdoc.addPage();
  addHeader(pdfdoc, logoImg);

  let y = 42;

  // ── Render each package option ──
  const options = packageOptions?.length
    ? packageOptions
    : [{ id: 1, name: "Package", hotelEntries: hotelEntries || [] }];

  for (let optIdx = 0; optIdx < options.length; optIdx++) {
    const opt = options[optIdx];
    const optHotels = opt.hotelEntries || [];

    y = ensureSpace(pdfdoc, logoImg, y, 30);

    // ── Option heading bar ──
    pdfdoc.setFillColor(BRAND);
    pdfdoc.rect(15, y - 4, 180, 8, "F");
    pdfdoc.setFont("helvetica", "bold");
    pdfdoc.setFontSize(FONT_HEADING);
    pdfdoc.setTextColor("#FFFFFF");
    pdfdoc.text(`${opt.name}`, 18, y + 1);
    pdfdoc.setTextColor("#000000");
    y += 10;

    // ── Hotel table for this option ──
    if (optHotels.length > 0) {
      autoTable(pdfdoc, {
        startY: y,
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
        didDrawCell: function (data) {
          if (data.section === "body" && data.column.index === 0) {
            const h = optHotels[data.row.index];
            const link =
              h?.GoogleListingURL ||
              h?.googleLink ||
              h?.tripAdvisorLink ||
              h?.TripAdvisorURL;
            if (link) {
              pdfdoc.link(
                data.cell.x,
                data.cell.y,
                data.cell.width,
                data.cell.height,
                { url: link },
              );
            }
          }
        },
        body: optHotels.flatMap((h) => {
          const hotelLink =
            h.GoogleListingURL ||
            h.googleLink ||
            h.tripAdvisorLink ||
            h.TripAdvisorURL;
          const hotelCell = hotelLink
            ? {
                content: h.hotel,
                styles: { textColor: [13, 71, 161], fontStyle: "bold" },
              }
            : h.hotel;

          const hasMultiRooms =
            Array.isArray(h.roomCategories) && h.roomCategories.length > 1;

          if (hasMultiRooms) {
            return h.roomCategories.map((rc, rcIdx) => {
              const guestParts = [
                `${rc.numDouble || 0} Room`,
                ...(rc.numExtraAdult > 0
                  ? [`${rc.numExtraAdult} Ext.Adult`]
                  : []),
                ...(rc.numExtraChild > 0 ? [`${rc.numExtraChild} Child`] : []),
                ...(rc.numCNB > 0 ? [`${rc.numCNB} CNB`] : []),
              ];
              return [
                rcIdx === 0
                  ? hotelCell
                  : { content: "", styles: { textColor: [100, 100, 100] } },
                h.city,
                rc.roomCategory || "—",
                `${formatDate(h.checkInDate)}\n${formatDate(h.checkOutDate)}`,
                h.nights,
                MEAL_PLAN_LABELS[rc.mealPlan] || rc.mealPlan || "—",
                guestParts.join(", "),
              ];
            });
          }
          // Single room (legacy or single-category)
          const primaryRoom = h.roomCategories?.[0];
          const numDouble = primaryRoom?.numDouble ?? h.numDouble ?? 0;
          const numExtraAdult =
            primaryRoom?.numExtraAdult ?? h.numExtraAdult ?? 0;
          const numExtraChild =
            primaryRoom?.numExtraChild ?? h.numExtraChild ?? 0;
          const numCNB = primaryRoom?.numCNB ?? h.numCNB ?? 0;
          const guestParts = [
            `${numDouble} Room`,
            ...(numExtraAdult > 0 ? [`${numExtraAdult} Ext.Adult`] : []),
            ...(numExtraChild > 0 ? [`${numExtraChild} Child`] : []),
            ...(numCNB > 0 ? [`${numCNB} CNB`] : []),
          ];
          return [
            [
              hotelCell,
              h.city,
              getPrimaryRoomCategory(h),
              `${formatDate(h.checkInDate)}\n${formatDate(h.checkOutDate)}`,
              h.nights,
              MEAL_PLAN_LABELS[getPrimaryMealPlan(h)] ||
                getPrimaryMealPlan(h) ||
                "—",
              guestParts.join(", "),
            ],
          ];
        }),
        theme: "grid",
        headStyles: {
          fillColor: BRAND,
          fontSize: FONT_SMALL,
          fontStyle: "bold",
        },
        styles: { fontSize: FONT_SMALL, cellPadding: 2.5, font: "helvetica" },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 22 },
          2: { cellWidth: 25 },
          3: { cellWidth: 28 },
          4: { cellWidth: 13 },
          5: { cellWidth: 28 },
          6: { cellWidth: 25 },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: () => addHeader(pdfdoc, logoImg),
      });
      y = pdfdoc.lastAutoTable.finalY + 4;
    }

    const breakdownRows = [];

    // AFTER — prefer pre-stored totals, fall back to recomputation
    const optionHotelTotal =
      typeof opt.hotelTotal === "number"
        ? opt.hotelTotal
        : optHotels.reduce((s, e) => s + resolveEntryTotal(e), 0);

    const optionMarkup =
      typeof opt.markup === "number"
        ? opt.markup
        : resolveOptionMarkup(
            opt,
            transportTotalPrice || 0,
            activityTotalPrice || 0,
            confirmedMarkup || 0,
            markupType,
            markupAmount,
          );

    const preDiscountTotal =
      typeof opt.preDiscountTotal === "number"
        ? opt.preDiscountTotal
        : optionHotelTotal +
          (transportTotalPrice || 0) +
          (activityTotalPrice || 0) +
          optionMarkup;

    const discountAmount =
      typeof opt.discountAmount === "number" && opt.discountAmount > 0
        ? opt.discountAmount
        : (() => {
            if (!appliedDiscount?.value || appliedDiscount.value <= 0) return 0;
            if (appliedDiscount.type === "percentage") {
              return Math.round(
                (appliedDiscount.value / 100) * preDiscountTotal,
              );
            }
            return Math.min(Number(appliedDiscount.value), preDiscountTotal);
          })();

    const optionGrandTotal =
      typeof opt.grandTotal === "number"
        ? opt.grandTotal
        : preDiscountTotal - discountAmount;

    // Sub-total row (only show when discount is present so customer sees the before/after)
    if (discountAmount > 0) {
      breakdownRows.push([
        {
          content: "Package Cost",
          styles: { fontStyle: "normal", fontSize: FONT_SMALL },
        },
        {
          content: `Rs. ${preDiscountTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
          styles: { halign: "right", fontSize: FONT_SMALL },
        },
      ]);
      breakdownRows.push([
        {
          content: `Special Discount${appliedDiscount.notes ? ` — ${appliedDiscount.notes}` : ""}`,
          styles: {
            fontStyle: "italic",
            textColor: [185, 28, 28],
            fontSize: FONT_SMALL,
          },
        },
        {
          content: ` Rs. ${discountAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
          styles: {
            halign: "right",
            fontStyle: "italic",
            textColor: [185, 28, 28],
            fontSize: FONT_SMALL,
          },
        },
      ]);
    }

    // Grand total now rendered as a separate, visually distinct card below
    // the breakdown table — no longer mixed in as a plain table row.

    y = ensureSpace(pdfdoc, logoImg, y, breakdownRows.length * 8 + 6);

    autoTable(pdfdoc, {
      startY: y,
      body: breakdownRows,
      theme: "grid",
      styles: { fontSize: FONT_SMALL, cellPadding: 2.5, font: "helvetica" },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50 } },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(pdfdoc, logoImg),
    });

    y = pdfdoc.lastAutoTable.finalY + 4;

    // Pricing summary card — replaces the old in-table grand-total row.
    y = ensureSpace(pdfdoc, logoImg, y, 22);
    y = drawPricingSummaryCard(
      pdfdoc,
      `${opt.name} — Total Tour Cost`,
      optionGrandTotal,
      y,
    );

    y += 10;
  }
  // ── MOVED: INCLUSIONS & EXCLUSIONS ──
  // ✅ Detect multi option
  const isMultiOption = packageOptions?.length > 1;

  // ✅ Get ALL hotel entries (same as summary logic)
  const allEntries = packageOptions?.length
    ? packageOptions.flatMap((o) => o.hotelEntries || [])
    : hotelEntries;

  // ✅ Calculate meals (only used for single option)
  const { totalBreakfasts, totalLunches, totalDinners } =
    calculateTotalMeals(allEntries);

  // ✅ Build INCLUDED dynamically
  const legacyIncluded = [];

  if (isMultiOption) {
    // 🔥 MULTI OPTION LOGIC
    legacyIncluded.push("Accommodation as per package selection");

    legacyIncluded.push(`Meal Plan as per package selection`);
  } else {
    // 🔥 SINGLE OPTION LOGIC
    legacyIncluded.push("Accommodation as specified.");

    if (totalBreakfasts > 0)
      legacyIncluded.push(`${totalBreakfasts} Breakfast(s)`);
    if (totalLunches > 0) legacyIncluded.push(`${totalLunches} Lunch(es)`);
    if (totalDinners > 0) legacyIncluded.push(`${totalDinners} Dinner(s)`);

    if (!totalBreakfasts && !totalLunches && !totalDinners) {
      legacyIncluded.push("No meals included (EP Plan)");
    }
  }

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
    // Decorative section divider before this section's heading
    y = drawDecorativeDivider(pdfdoc, y + 4);
    y += 4;
    y = drawSectionHeading(pdfdoc, "Inclusions & Exclusions", y);
    y += 8;

    const incExcBody = Array.from(
      { length: Math.max(allIncluded.length, allExcluded.length) },
      (_, i) => [allIncluded[i] || "", allExcluded[i] || ""],
    );

    autoTable(pdfdoc, {
      startY: y,
      margin: {
        top: 42,
        left: 15,
        right: 15,
      },
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
        cellPadding: { top: 3, right: 3, bottom: 3, left: 8 },
        valign: "top",
        font: "helvetica",
      },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
      // Draw a check icon (col 0) or a cross icon (col 1) inside the cell's
      // left padding zone, next to each non-empty line.
      didDrawCell: (data) => {
        if (data.section !== "body") return;
        const text = Array.isArray(data.cell.text)
          ? data.cell.text.join(" ").trim()
          : (data.cell.text || "").trim();
        if (!text) return;
        const iconX = data.cell.x + 1.5;
        const iconY = data.cell.y + 1.8;
        if (data.column.index === 0) Icon.check(pdfdoc, iconX, iconY);
        else if (data.column.index === 1) Icon.cross(pdfdoc, iconX, iconY);
      },
      didDrawPage: function () {
        addHeader(pdfdoc, logoImg);
      },
    });

    // Update y to the end of this table for any sections following it
    y = pdfdoc.lastAutoTable.finalY;
  }

  addFooter(pdfdoc);

  addFooter(pdfdoc);

  // ITINERARY PAGES + INCLUSIONS & EXCLUSIONS (original logic preserved)
  // ── ITINERARY PAGES ─────────────────────────────────────────────

  const itin = itineraryData;

  // ✅ Only check if days exist (NOT strict)
  const hasValidItinerary =
    itin && Array.isArray(itin.days) && itin.days.length > 0;

  if (hasValidItinerary) {
    pdfdoc.addPage();
    addHeader(pdfdoc, logoImg);

    y = 42;

    // Decorative divider above the section heading
    y = drawDecorativeDivider(pdfdoc, y);
    y += 4;

    // ── Heading ──
    y = drawSectionHeading(
      pdfdoc,
      `Itinerary${itin.title ? ": " + itin.title : ""}`,
      y,
    );
    y += 6;

    // ── Cities ──
    // if (itin.cities?.length) {
    //   pdfdoc.setFont("helvetica", "normal");
    //   pdfdoc.setFontSize(FONT_BODY);
    //   pdfdoc.setTextColor("#555");
    //   pdfdoc.text(`Cities: ${itin.cities.join("  •  ")}`, 15, y);
    //   y += 8;
    // }

    // ✅ Filter valid days (ONLY for rendering days)
    const validDays = itin.days.filter((d) => d && (d.title || d.description));

    // ── Day-wise Heading ──
    if (validDays.length > 0) {
      pdfdoc.setFont("helvetica", "bold");
      pdfdoc.setFontSize(FONT_DAY);
      pdfdoc.setTextColor(BRAND_DARK);
      pdfdoc.text("Day-wise Program", 15, y);
      y += 7;

      for (let di = 0; di < validDays.length; di++) {
        const day = validDays[di];
        const originalIndex = itin.days.indexOf(day);

        const enrichedDay = {
          ...day,
          images: (dayImagesMap[originalIndex] || [])
            .map((imgObj, ii) =>
              imgObj ? { imgObj, src: (day.images || [])[ii] } : null,
            )
            .filter(Boolean)
            .map((x) => x.src),
        };

        y = await drawDay(pdfdoc, logoImg, enrichedDay, y);
      }
    }

    // 🔥 IMPORTANT: ALWAYS show these (independent of validDays)

    const selectedTnc = (itin.tnc || []).filter((i) => i.selected);
    const selectedCan = (itin.cancellation || []).filter((i) => i.selected);

    if (selectedTnc.length || selectedCan.length) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y = drawDecorativeDivider(pdfdoc, y + 2);
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
          BRAND,
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
          BRAND,
          true,
        );
      }
    }

    if (itin.impInfo?.some((i) => i.selected)) {
      y = ensureSpace(pdfdoc, logoImg, y, 16);
      y = drawDecorativeDivider(pdfdoc, y + 2);
      y += 4;

      y = drawSectionHeading(pdfdoc, "Important Information", y);
      y += 4;

      y = drawChecklist(pdfdoc, logoImg, "", itin.impInfo, y, BRAND, true);
    }

    addFooter(pdfdoc);
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
