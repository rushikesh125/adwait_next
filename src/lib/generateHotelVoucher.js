import { jsPDF } from "jspdf";

/* ─── Brand constants (matching real Adwait Tours quotation PDF) ─────────── */
const BRAND = {
  name:    "Adwait Tours",
  address: "Nagpur, Maharashtra, India",
  phone:   "+91 9884798483",
  email:   "sales@adwaittours.com",
  web:     "www.adwaittours.com",
  primary: "#0D47A1",
  accent:  "#1565C0",
  light:   "#E3F2FD",
  rule:    "#BBDEFB",
  text:    "#1A1A2E",
  muted:   "#546E7A",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt = (dateStr) => {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (isNaN(d)) return String(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const sanitise = (str) =>
  (str || "Hotel")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "_");

const hex2rgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const loadLogoBase64 = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = `/adwait-logo.jpg?v=${Date.now()}`;
  });

/* ─── Main export (async because we pre-load the logo) ──────────────────── */
export async function generateHotelVoucherPDF(voucher = {}) {
  const logoBase64 = await loadLogoBase64();

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PW = 210;
  const PH = 297;
  const ML = 15;
  const MR = 15;
  const CW = PW - ML - MR;   // 180 mm
  let   y  = 15;

  /* ── Utility helpers ─────────────────────────────────────────────────── */
  const setFont = (style = "normal", size = 10, color = BRAND.text) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...hex2rgb(color));
  };

  const rule = (thickness = 0.4, color = BRAND.rule, yy = y) => {
    doc.setDrawColor(...hex2rgb(color));
    doc.setLineWidth(thickness);
    doc.line(ML, yy, ML + CW, yy);
  };

  const filledRect = (x, yy, w, h, hexColor) => {
    doc.setFillColor(...hex2rgb(hexColor));
    doc.rect(x, yy, w, h, "F");
  };

  const borderedRect = (x, yy, w, h, hexStroke, hexFill = null) => {
    if (hexFill) {
      doc.setFillColor(...hex2rgb(hexFill));
      doc.rect(x, yy, w, h, "F");
    }
    doc.setDrawColor(...hex2rgb(hexStroke));
    doc.setLineWidth(0.35);
    doc.rect(x, yy, w, h, "S");
  };

  /* ─────────────────────────────────────────────────────────────────────
     HEADER — logo left, company details right
  ───────────────────────────────────────────────────────────────────── */
  const LOGO_W = 42;
  const LOGO_H = 18;

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", ML, y, LOGO_W, LOGO_H);
  } else {
    filledRect(ML, y, LOGO_W, LOGO_H, BRAND.primary);
    setFont("bold", 13, "#FFFFFF");
    doc.text("ADWAIT", ML + LOGO_W / 2, y + 8,    { align: "center" });
    setFont("normal", 8, "#BBDEFB");
    doc.text("TOURS",  ML + LOGO_W / 2, y + 13.5, { align: "center" });
  }

  const rightX = ML + CW;
  setFont("bold", 12, BRAND.primary);
  doc.text(BRAND.name, rightX, y + 5, { align: "right" });
  setFont("normal", 8, BRAND.muted);
  doc.text(`Phone: ${BRAND.phone}`, rightX, y + 10,   { align: "right" });
  doc.text(`Email: ${BRAND.email}`, rightX, y + 14.5, { align: "right" });
  doc.text(`Web: ${BRAND.web}`,     rightX, y + 19,   { align: "right" });

  y += 24;
  rule(0.6, BRAND.primary);
  y += 5;

  /* ─────────────────────────────────────────────────────────────────────
     TITLE
  ───────────────────────────────────────────────────────────────────── */
  setFont("bold", 16, BRAND.primary);
  doc.text("Hotel Booking Voucher", ML + CW / 2, y, { align: "center" });
  y += 7;

  const issuedOn = voucher.issueDate
    ? fmt(voucher.issueDate)
    : new Date().toLocaleDateString("en-GB");

  setFont("normal", 8.5, BRAND.muted);
  doc.text(
    `Voucher No: ${voucher.voucherNumber || "\u2014"}   |   Generated on: ${issuedOn}`,
    ML + CW,
    y,
    { align: "right" }
  );
  y += 6;

  rule(0.5, BRAND.primary);
  y += 7;

  /* ─────────────────────────────────────────────────────────────────────
     GUEST DETAILS
  ───────────────────────────────────────────────────────────────────── */
  setFont("bold", 10, BRAND.primary);
  doc.text("GUEST DETAILS", ML, y);
  y += 5;

  const guestNames = (voucher.guests || [])
    .filter((g) => g.name?.trim())
    .map((g) => `${g.title || ""} ${g.name}`.trim())
    .join("   \u2022   ");

  const displayName = guestNames || voucher.customerName || "\u2014";
  const pax = (voucher.guests || []).filter((g) => g.name?.trim()).length || 1;

  filledRect(ML, y, CW, 10, BRAND.light);
  borderedRect(ML, y, CW, 10, BRAND.rule);
  setFont("bold", 10, BRAND.primary);
  doc.text(displayName, ML + 4, y + 6.5);
  y += 14;

  setFont("normal", 9, BRAND.text);
  if (voucher.contact) doc.text(`Contact: ${voucher.contact}`, ML, y);
 
  y += 8;

  rule(0.3);
  y += 6;

  /* ─────────────────────────────────────────────────────────────────────
     BOOKING DETAILS  (2-column grid)
  ───────────────────────────────────────────────────────────────────── */
  setFont("bold", 10, BRAND.primary);
  doc.text("BOOKING DETAILS", ML, y);
  y += 5;

  const colL = ML;
  const colR = ML + CW / 2 + 2;

  setFont("bold", 11, BRAND.text);
  doc.text(voucher.hotelName || "\u2014", colL, y);
  y += 5;

  if (voucher.address) {
    setFont("normal", 8.5, BRAND.muted);
    const addrLines = doc.splitTextToSize(voucher.address, CW);
    doc.text(addrLines, colL, y);
    y += addrLines.length * 4.5 + 2;
  }

  y += 1;

  const gridRows = [
    ["Check-in",      `${fmt(voucher.checkIn)} at 12:00 Noon`],
    ["Check-out",     `${fmt(voucher.checkOut)} at 11:00 AM`],
    ["Nights",        String(voucher.nights  || "\u2014")],
    ["Rooms",         String(voucher.rooms   || "\u2014")],
    ["Room Category", voucher.roomCategory   || "\u2014"],
    ["Meal Plan",     voucher.meal || voucher.mealPlan || "\u2014"],
  ];

  gridRows.forEach(([label, value], i) => {
    const col  = i % 2 === 0 ? colL : colR;
    const row  = Math.floor(i / 2);
    const rowY = y + row * 10;

    if (i % 2 === 0 && row % 2 === 0) {
      filledRect(ML, rowY - 3, CW, 9, "#F5F9FF");
    }

    setFont("bold", 8, BRAND.muted);
    doc.text(label.toUpperCase(), col, rowY);
    setFont("normal", 9.5, BRAND.text);
    doc.text(value, col, rowY + 5);
  });

  y += Math.ceil(gridRows.length / 2) * 10 + 4;
  rule(0.3);
  y += 6;

  /* ─────────────────────────────────────────────────────────────────────
     SPECIAL REQUESTS
  ───────────────────────────────────────────────────────────────────── */
  if (voucher.requests?.trim()) {
    setFont("bold", 10, BRAND.primary);
    doc.text("SPECIAL REQUESTS", ML, y);
    y += 4;

    setFont("normal", 9, BRAND.text);
    const reqLines = doc.splitTextToSize(voucher.requests, CW - 8);
    const reqH = reqLines.length * 5 + 6;
    borderedRect(ML, y, CW, reqH, BRAND.rule, "#FFFDE7");
    doc.text(reqLines, ML + 4, y + 5);
    y += reqH + 5;

    rule(0.3);
    y += 6;
  }

  /* ─────────────────────────────────────────────────────────────────────
     PAYMENT — Updated Logic
  ───────────────────────────────────────────────────────────────────── */
  setFont("bold", 10, BRAND.primary);
  doc.text("PAYMENT", ML, y);
  y += 5;

  const rupee = "\u20B9";
  const dash  = "\u2014";

  let payText = voucher.paymentStatus || dash;

  if (voucher.amount) {
    const shouldShowAmount =
      voucher.paymentStatus === "Payment at hotel" ||
      (voucher.paymentStatus === "Amount paid to hotel" && voucher.showAmountInVoucher === true);

    if (shouldShowAmount) {
      payText = `${voucher.paymentStatus} ${dash} ${rupee}${voucher.amount}`;
    } else {
      payText = `${voucher.paymentStatus}`;
    }
  }

  filledRect(ML, y, CW, 9, BRAND.light);
  borderedRect(ML, y, CW, 9, BRAND.rule);
  setFont("normal", 9.5, BRAND.text);
  doc.text(payText, ML + 4, y + 6);
  y += 13;

  /* ─────────────────────────────────────────────────────────────────────
     CANCELLATION POLICY
  ───────────────────────────────────────────────────────────────────── */
  if (voucher.cancellation?.trim()) {
    rule(0.3);
    y += 5;

    setFont("bold", 10, BRAND.primary);
    doc.text("CANCELLATION POLICY", ML, y);
    y += 4;

    setFont("normal", 8.5, BRAND.muted);
    const canLines = doc.splitTextToSize(voucher.cancellation, CW - 4);
    doc.text(canLines, ML, y);
    y += canLines.length * 4.5 + 5;
  }

  /* ─────────────────────────────────────────────────────────────────────
     BOOKING REFERENCE BOX
  ───────────────────────────────────────────────────────────────────── */
  rule(0.3);
  y += 6;

  const refBoxH = 14;
  borderedRect(ML, y, CW, refBoxH, BRAND.primary, "#EBF5FB");
  setFont("bold", 8, BRAND.muted);
  doc.text("BOOKING REFERENCE", ML + CW / 2, y + 4.5, { align: "center" });
  setFont("bold", 13, BRAND.primary);
  doc.text(voucher.voucherNumber || "\u2014", ML + CW / 2, y + 11, { align: "center" });
  y += refBoxH + 8;

  /* ─────────────────────────────────────────────────────────────────────
     FOOTER
  ───────────────────────────────────────────────────────────────────── */
  const footerY = Math.max(y + 4, PH - 38);

  rule(0.6, BRAND.primary, footerY);

  setFont("normal", 8, BRAND.muted);
  const footNote =
    "This voucher is issued by Adwait Tours. Carry this document and a valid photo ID at check-in.";
  const footLines = doc.splitTextToSize(footNote, CW);
  doc.text(footLines, ML + CW / 2, footerY + 5, { align: "center" });

  setFont("bold", 9, BRAND.primary);
  doc.text("Authorised by: Adwait Tours", ML + CW, footerY + 13, { align: "right" });

  doc.setDrawColor(...hex2rgb(BRAND.rule));
  doc.setLineWidth(0.3);
  doc.line(ML + CW - 55, footerY + 10, ML + CW, footerY + 10);

  setFont("normal", 7, BRAND.muted);
  doc.text(
    `\u00A9 ${new Date().getFullYear()} Adwait Tours \u00B7 All rights reserved`,
    ML,
    footerY + 13
  );

  /* ─────────────────────────────────────────────────────────────────────
     SAVE
  ───────────────────────────────────────────────────────────────────── */
  const hotelSlug = sanitise(voucher.hotelName);
  const fileName  = `Voucher_${voucher.voucherNumber || "ADW-HTL"}_${hotelSlug}.pdf`;
  doc.save(fileName);
}

/* ─── WhatsApp share helper ──────────────────────────────────────────────── */
export function shareHotelVoucherWhatsApp(voucher = {}, agentPhone = BRAND.phone) {
  const guestName =
    voucher.guests?.find((g) => g.name?.trim())
      ? `${voucher.guests[0].title || ""} ${voucher.guests[0].name}`.trim()
      : voucher.customerName || "Guest";

  const city      = voucher.destination || "";
  const hotelLine = city
    ? `${voucher.hotelName || "\u2014"}, ${city}`
    : (voucher.hotelName || "\u2014");

  const message = [
    `Dear ${guestName},`,
    ``,
    `Your hotel voucher is ready. \uD83C\uDFE8`,
    `Hotel: ${hotelLine}`,
    `Check-in: ${fmt(voucher.checkIn)} at 12:00 Noon`,
    `Check-out: ${fmt(voucher.checkOut)} at 11:00 AM`,
    `Voucher Ref: ${voucher.voucherNumber || "\u2014"}`,
    ``,
    `Please carry this reference and a valid photo ID at check-in.`,
    ``,
    `For any assistance: ${agentPhone}`,
    `\u2014 Adwait Tours`,
  ].join("\n");

  const rawContact = String(voucher.contact || "").replace(/\D/g, "");
  const waNumber   = rawContact.length === 10 ? `91${rawContact}` : rawContact;
  const url        = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}