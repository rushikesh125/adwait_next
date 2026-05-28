// src/utils/generateInvoicePDF.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Brand ────────────────────────────────────────────────────────────────────
const B = {
  name:    "Adwait Tours",
  tagline: "Your Trusted Travel Partner",
  address: "Nagpur, Maharashtra, India",
  phone:   "+91 9884798483",
  email:   "sales@adwaittours.com",
  web:     "www.adwaittours.com",
  navy:    "#0D3B6E",
  blue:    "#1565C0",
  sky:     "#EFF6FF",
  ink:     "#0F172A",
  body:    "#1E293B",
  muted:   "#64748B",
  border:  "#CBD5E1",
  row:     "#F8FAFC",
  green:   "#15803D",
  red:     "#B91C1C",
  accent:  "#2563EB",
};

// ─── Page geometry ────────────────────────────────────────────────────────────
const PW          = 210;
const PH          = 297;
const ML          = 15;
const MR          = 15;
const CW          = PW - ML - MR;   // 180 mm usable width
const FOOTER_H    = 16;
const FOOTER_Y    = PH - FOOTER_H;
const SAFE_BOTTOM = FOOTER_Y - 4;
const HEADER_H    = 32;              // gradient band height
const HEADER_END  = HEADER_H + 5;   // body starts here

// ─── Colour helper ────────────────────────────────────────────────────────────
const h2r = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// ─── Safe string — strips non-latin1 glyphs that corrupt jsPDF rendering ─────
// jsPDF's built-in Helvetica/Courier only covers latin-1 (0x00–0xFF).
// Any codepoint above 0xFF (e.g. Ø ß è or Devanagari) causes garbled output.
// We transliterate common accented chars, then drop anything still outside range.
const TRANSLIT = {
  // Latin extended
  "\u00C0":"A","\u00C1":"A","\u00C2":"A","\u00C3":"A","\u00C4":"A","\u00C5":"A",
  "\u00E0":"a","\u00E1":"a","\u00E2":"a","\u00E3":"a","\u00E4":"a","\u00E5":"a",
  "\u00C8":"E","\u00C9":"E","\u00CA":"E","\u00CB":"E",
  "\u00E8":"e","\u00E9":"e","\u00EA":"e","\u00EB":"e",
  "\u00CC":"I","\u00CD":"I","\u00CE":"I","\u00CF":"I",
  "\u00EC":"i","\u00ED":"i","\u00EE":"i","\u00EF":"i",
  "\u00D2":"O","\u00D3":"O","\u00D4":"O","\u00D5":"O","\u00D6":"O","\u00D8":"O",
  "\u00F2":"o","\u00F3":"o","\u00F4":"o","\u00F5":"o","\u00F6":"o","\u00F8":"o",
  "\u00D9":"U","\u00DA":"U","\u00DB":"U","\u00DC":"U",
  "\u00F9":"u","\u00FA":"u","\u00FB":"u","\u00FC":"u",
  "\u00DD":"Y","\u00FD":"y","\u00FF":"y",
  "\u00C7":"C","\u00E7":"c","\u00D1":"N","\u00F1":"n",
  "\u00DF":"ss","\u00C6":"AE","\u00E6":"ae",
  // Smart quotes / dashes
  "\u2018":"'","\u2019":"'","\u201C":'"',"\u201D":'"',
  "\u2013":"-","\u2014":"--","\u2026":"...",
  // Rupee sign → Rs.
  "\u20B9":"Rs.",
};

const safe = (val) => {
  if (val == null) return "";
  return String(val)
    .replace(/[^\x00-\xFF]/g, (ch) => TRANSLIT[ch] ?? "")
    .replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
};

// ─── Formatting ───────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d) ? safe(String(v)) : d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const rs = (n) => {
  const num = Number(n) || 0;
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
};

const safeNum = (v) => (v != null && !isNaN(Number(v)) ? Number(v) : 0);

// ─── Font loader ──────────────────────────────────────────────────────────────
let FF = "helvetica"; // font family — upgraded to Inter if TTFs are present

const tryLoadFont = async (doc, url, name, style) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    let bin = "";
    new Uint8Array(buf).forEach((b) => { bin += String.fromCharCode(b); });
    const b64 = typeof btoa === "function" ? btoa(bin) : null;
    if (!b64) return false;
    const file = url.split("/").pop();
    doc.addFileToVFS(file, b64);
    doc.addFont(file, name, style);
    return true;
  } catch { return false; }
};

const installFonts = async (doc) => {
  const okR = await tryLoadFont(doc, "/fonts/Inter-Regular.ttf", "Inter", "normal");
  const okB = await tryLoadFont(doc, "/fonts/Inter-Bold.ttf",    "Inter", "bold");
  if (okR && okB) FF = "Inter";
};

// ─── Logo loader ──────────────────────────────────────────────────────────────
const loadLogo = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = "/adwait-logo.jpg";
  });

// ─── Gradient band ────────────────────────────────────────────────────────────
const gradientRect = (doc, x, y, w, h, colorA, colorB) => {
  const steps = 30;
  const [r1,g1,b1] = h2r(colorA);
  const [r2,g2,b2] = h2r(colorB);
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    doc.setFillColor(
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t),
    );
    doc.rect(x, y + i * sh, w, sh + 0.2, "F");
  }
};

// ─── Watermark ────────────────────────────────────────────────────────────────
const drawWatermark = (doc, logo) => {
  if (!logo) return;
  try {
    const GS = doc.GState || (doc.constructor && doc.constructor.GState);
    if (!GS) return;
    doc.setGState(new GS({ opacity: 0.04 }));
    const s = 100;
    doc.addImage(logo, "PNG", (PW - s) / 2, (PH - s) / 2, s, s);
    doc.setGState(new GS({ opacity: 1 }));
  } catch { /* silent */ }
};

// ─── Header ───────────────────────────────────────────────────────────────────
// Full-width gradient band. Logo left, brand text centre-left, doc meta right.
const drawHeader = (doc, logo, invoice = {}) => {
  gradientRect(doc, 0, 0, PW, HEADER_H, B.navy, B.accent);

  // Logo
  if (logo) doc.addImage(logo, "PNG", ML, 7, 18, 18);
  const tx = ML + (logo ? 22 : 0);

  // Brand name
  doc.setFont(FF, "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(safe(B.name), tx, 13);

  // Tagline
  doc.setFont(FF, "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...h2r("#BFDBFE"));
  doc.text(safe(B.tagline), tx, 18);

  // Contact line
  doc.setFont(FF, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...h2r("#93C5FD"));
  doc.text(`${safe(B.address)}   |   ${safe(B.phone)}   |   ${safe(B.email)}`, tx, 23);
  doc.text(safe(B.web), tx, 27.5);

  // Right column: document type + meta
  const rx = PW - MR;
  doc.setFont(FF, "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", rx, 11, { align: "right" });

  // Thin divider line under "TAX INVOICE"
  doc.setDrawColor(...h2r("#60A5FA"));
  doc.setLineWidth(0.4);
  doc.line(rx - 52, 13, rx, 13);

  const meta = [
    ["Invoice No.", safe(invoice.invoiceNumber || "-")],
    ["Date",        fmt(invoice.invoiceDate)],
  ];
  if (invoice.dueDate)    meta.push(["Due Date",    fmt(invoice.dueDate)]);
  if (invoice.bookingRef) meta.push(["Booking Ref", safe(String(invoice.bookingRef))]);

  let my = 18;
  meta.forEach(([k, v]) => {
    doc.setFont(FF, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...h2r("#93C5FD"));
    doc.text(`${k}:`, rx - 30, my, { align: "right" });
    doc.setFont(FF, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(v, rx, my, { align: "right" });
    my += 3.8;
  });

  // Accent line below header band
  doc.setFillColor(...h2r(B.accent));
  doc.rect(0, HEADER_H, PW, 1.2, "F");

  return HEADER_END;
};

// ─── Footer ───────────────────────────────────────────────────────────────────
const drawAllFooters = (doc) => {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    // Two-tone footer
    doc.setFillColor(...h2r(B.accent));
    doc.rect(0, FOOTER_Y, PW, 1.2, "F");
    doc.setFillColor(...h2r(B.navy));
    doc.rect(0, FOOTER_Y + 1.2, PW, FOOTER_H - 1.2, "F");

    doc.setFont(FF, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Thank you for your business!", PW / 2, FOOTER_Y + 6.5, { align: "center" });

    doc.setFont(FF, "normal");
    doc.setFontSize(6);
    doc.setTextColor(...h2r("#93C5FD"));
    doc.text(
      `${safe(B.phone)}   |   ${safe(B.email)}   |   ${safe(B.web)}`,
      PW / 2, FOOTER_Y + 11.5, { align: "center" },
    );

    if (total > 1) {
      doc.text(`Page ${p} of ${total}`, PW - MR, FOOTER_Y + 11.5, { align: "right" });
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const maybeNewPage = (doc, logo, invoice, y, needed = 20) => {
  if (y + needed > SAFE_BOTTOM) {
    doc.addPage();
    drawWatermark(doc, logo);
    return drawHeader(doc, logo, invoice);
  }
  return y;
};

const hRule = (doc, y, color = B.border, thick = 0.25) => {
  doc.setDrawColor(...h2r(color));
  doc.setLineWidth(thick);
  doc.line(ML, y, ML + CW, y);
};

const sectionHeading = (doc, text, y) => {
  // Pill-style section label with left accent bar
  doc.setFillColor(...h2r(B.sky));
  doc.rect(ML, y, CW, 6.5, "F");
  doc.setFillColor(...h2r(B.accent));
  doc.rect(ML, y, 2.5, 6.5, "F");
  doc.setFont(FF, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...h2r(B.navy));
  doc.text(safe(text), ML + 6, y + 4.5);
  return y + 6.5 + 3; // returns next Y after the heading + gap
};

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateInvoicePDF(invoice = {}) {
  if (!invoice || typeof invoice !== "object") {
    console.error("[generateInvoicePDF] Invalid invoice object");
    return;
  }

  const logo = await loadLogo();
  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await installFonts(doc);

  drawWatermark(doc, logo);
  let y = drawHeader(doc, logo, invoice);

  // ── BILL TO ───────────────────────────────────────────────────────────────
  // White card with a left navy stripe and status pill top-right.
  const billLines = [];
  const contactLine = [
    invoice.customerMobile && `Ph: ${safe(invoice.customerMobile)}`,
    invoice.customerEmail  && safe(invoice.customerEmail),
  ].filter(Boolean).join("   |   ");
  if (contactLine) billLines.push(contactLine);
  if (invoice.customerAddress) {
    doc.setFontSize(8);
    doc.splitTextToSize(safe(invoice.customerAddress), CW * 0.62)
       .forEach((l) => billLines.push(l));
  }

  const cardH = 8 + 7 + billLines.length * 4.5 + 4;

  // Card background + shadow hint
  doc.setFillColor(...h2r("#F1F5F9"));
  doc.roundedRect(ML + 0.5, y + 0.5, CW, cardH, 2.5, 2.5, "F"); // shadow
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...h2r(B.border));
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, cardH, 2.5, 2.5, "FD");

  // Left accent stripe
  doc.setFillColor(...h2r(B.navy));
  doc.rect(ML, y, 3, cardH, "F");

  // "BILL TO" label
  doc.setFont(FF, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...h2r(B.accent));
  doc.text("BILL TO", ML + 7, y + 6);

  // Customer name
  doc.setFont(FF, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...h2r(B.ink));
  doc.text(safe(invoice.customerName || "-"), ML + 7, y + 12.5);

  // Contact / address lines
  doc.setFont(FF, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...h2r(B.muted));
  let by = y + 17;
  billLines.forEach((ln) => {
    doc.text(safe(ln), ML + 7, by);
    by += 4.5;
  });

  // Status pill — top right
  const statusText = safe(String(invoice.status || "Draft").toUpperCase());
  const isPaid = /^PAID$/.test(statusText);
  const pillBg = isPaid ? B.green : B.accent;
  doc.setFont(FF, "bold");
  doc.setFontSize(7);
  const pillW = doc.getTextWidth(statusText) + 7;
  const pillX = ML + CW - pillW - 5;
  const pillY = y + 5;
  doc.setFillColor(...h2r(pillBg));
  doc.roundedRect(pillX, pillY, pillW, 5.5, 1.4, 1.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pillX + pillW / 2, pillY + 3.9, { align: "center" });

  y += cardH + 7;

  // ── LINE ITEMS ────────────────────────────────────────────────────────────
  y = maybeNewPage(doc, logo, invoice, y, 30);
  y = sectionHeading(doc, "ITEMS & SERVICES", y);

  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

  // Column widths: 8 + 70 + 10 + 24 + 18 + 14 + 36 = 180 = CW
  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Qty", "Unit Price", "Discount", "GST", "Amount"]],
    body: lineItems.map((item, i) => {
      const disc =
        safeNum(item.discountValue) > 0
          ? item.discountType === "percentage"
            ? `${item.discountValue}%`
            : rs(item.discountValue)
          : "";
      return [
        i + 1,
        safe(item.itemName || item.description || ""),
        item.quantity ?? 1,
        rs(safeNum(item.unitPrice)),
        disc,
        safeNum(item.gstRate) > 0 ? `${item.gstRate}%` : "Nil",
        rs(safeNum(item.total)),
      ];
    }),
    theme: "plain",
    headStyles: {
      fillColor: h2r(B.navy),
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 4.5, bottom: 4.5, left: 3, right: 3 },
    },
    bodyStyles: {
      font: FF,
      fontSize: 8.5,
      textColor: h2r(B.body),
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: h2r(B.row) },
    tableWidth: CW,
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 36, halign: "right" },
    },
    margin: { left: ML, right: MR },
    // Bold item name; sub-description rendered in muted smaller text below it
    willDrawCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const item = lineItems[d.row.index];
        if (item?.itemName) d.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const item = lineItems[d.row.index];
        if (item?.itemName && item?.description) {
          doc.setFont(FF, "normal");
          doc.setFontSize(7);
          doc.setTextColor(...h2r(B.muted));
          const lines = doc.splitTextToSize(safe(item.description), d.cell.width - 6);
          doc.text(lines, d.cell.x + 3, d.cell.y + d.cell.padding("top") + 7);
        }
      }
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const item = lineItems[d.row.index];
        if (item?.itemName && item?.description) {
          const descLines = doc.splitTextToSize(safe(item.description), 70 - 6);
          const ln  = Math.max(1, descLines.length);
          d.cell.styles.minCellHeight = 7 + ln * 3.8 + 4;
        }
      }
    },
    didDrawPage: () => {
      drawWatermark(doc, logo);
      y = drawHeader(doc, logo, invoice);
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const totRows = [["Subtotal", safeNum(invoice.subtotal), false]];
  if (safeNum(invoice.discountTotal) > 0)
    totRows.push(["Discount", -safeNum(invoice.discountTotal), true]);
  totRows.push(["Taxable Amount", safeNum(invoice.taxableAmount), false]);
  if (invoice.gstType === "inter") {
    if (safeNum(invoice.igst) > 0) totRows.push(["IGST", safeNum(invoice.igst), false]);
  } else {
    if (safeNum(invoice.cgst) > 0) totRows.push(["CGST", safeNum(invoice.cgst), false]);
    if (safeNum(invoice.sgst) > 0) totRows.push(["SGST", safeNum(invoice.sgst), false]);
  }

  y = maybeNewPage(doc, logo, invoice, y, totRows.length * 9 + 30);

  // Totals table — right-aligned, 50% page width
  const TOT_W = 90;
  const TOT_X = ML + CW - TOT_W;

  autoTable(doc, {
    startY: y,
    body: totRows.map(([lbl, val, isNeg]) => [
      {
        content: safe(lbl),
        styles: { textColor: h2r(B.muted), fontStyle: "normal", halign: "left" },
      },
      {
        content: isNeg ? `- ${rs(Math.abs(Number(val)))}` : rs(Number(val)),
        styles: {
          textColor: h2r(isNeg ? B.red : B.body),
          fontStyle: "bold",
          halign: "right",
        },
      },
    ]),
    theme: "plain",
    styles: {
      font: FF,
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      fillColor: h2r(B.row),
    },
    tableWidth: TOT_W,
    columnStyles: {
      0: { cellWidth: TOT_W * 0.55 },
      1: { cellWidth: TOT_W * 0.45 },
    },
    margin: { left: TOT_X, right: MR },
  });

  y = doc.lastAutoTable.finalY;

  // Grand Total ribbon
  const ribbonH = 15;
  // Accent left stripe
  doc.setFillColor(...h2r(B.accent));
  doc.rect(TOT_X, y, 4, ribbonH, "F");
  // Navy body
  doc.setFillColor(...h2r(B.navy));
  doc.rect(TOT_X + 4, y, TOT_W - 4, ribbonH, "F");
  // Label
  doc.setFont(FF, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...h2r("#93C5FD"));
  doc.text("GRAND TOTAL", TOT_X + 8, y + 5.5);
  // Amount
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    rs(safeNum(invoice.grandTotal)),
    TOT_X + TOT_W - 4,
    y + 11,
    { align: "right" },
  );

  y += ribbonH + 10;

  // ── PAYMENT SUMMARY ───────────────────────────────────────────────────────
  const payments    = Array.isArray(invoice.payments) ? invoice.payments : [];
  const hasPayments = payments.length > 0 || safeNum(invoice.amountReceived) > 0;

  if (hasPayments) {
    y = maybeNewPage(doc, logo, invoice, y, 36);
    y = sectionHeading(doc, "PAYMENT RECEIVED", y);

    if (payments.length > 0) {
      // 28 + 72 + 44 + 36 = 180 = CW
      autoTable(doc, {
        startY: y,
        head: [["Date", "Account / Mode", "Reference", "Amount"]],
        body: payments.map((p) => [
          fmt(p.date),
          safe(p.paymentAccountName || p.mode || "-"),
          safe(p.reference || "-"),
          rs(safeNum(p.amount)),
        ]),
        theme: "plain",
        headStyles: {
          fillColor: h2r("#334155"),
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
          cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        },
        bodyStyles: {
          font: FF,
          fontSize: 8,
          textColor: h2r(B.body),
          cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        },
        alternateRowStyles: { fillColor: h2r(B.row) },
        tableWidth: CW,
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 72 },
          2: { cellWidth: 44 },
          3: { cellWidth: 36, halign: "right" },
        },
        margin: { left: ML, right: MR },
        didDrawPage: () => {
          drawWatermark(doc, logo);
          y = drawHeader(doc, logo, invoice);
        },
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    // Amount received + Balance due
    y = maybeNewPage(doc, logo, invoice, y, 22);
    const fullyPaid = safeNum(invoice.amountDue) <= 0;

    autoTable(doc, {
      startY: y,
      body: [
        [
          { content: "Amount Received", styles: { textColor: h2r(B.muted), fontStyle: "normal" } },
          {
            content: rs(safeNum(invoice.amountReceived)),
            styles: { textColor: h2r(B.green), fontStyle: "bold", halign: "right" },
          },
        ],
        [
          { content: "Balance Due",     styles: { textColor: h2r(B.muted), fontStyle: "normal" } },
          {
            content: rs(safeNum(invoice.amountDue)),
            styles: {
              textColor: h2r(fullyPaid ? B.green : B.red),
              fontStyle: "bold",
              halign: "right",
            },
          },
        ],
      ],
      theme: "plain",
      styles: {
        font: FF,
        fontSize: 9.5,
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        fillColor: h2r(fullyPaid ? "#F0FDF4" : "#FFF7ED"),
      },
      tableWidth: CW,
      columnStyles: {
        0: { cellWidth: CW * 0.65 },
        1: { cellWidth: CW * 0.35 },
      },
      margin: { left: ML, right: MR },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // ── NOTES & T&C ───────────────────────────────────────────────────────────
  if (invoice.notes || invoice.termsAndConditions) {
    y = maybeNewPage(doc, logo, invoice, y, 20);
    hRule(doc, y, B.border, 0.3);
    y += 5;

    if (invoice.notes) {
      y = maybeNewPage(doc, logo, invoice, y, 15);
      y = sectionHeading(doc, "NOTES", y);
      doc.setFont(FF, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...h2r(B.body));
      const nl = doc.splitTextToSize(safe(invoice.notes), CW);
      doc.text(nl, ML, y);
      y += nl.length * 4.5 + 5;
    }

    if (invoice.termsAndConditions) {
      y = maybeNewPage(doc, logo, invoice, y, 15);
      y = sectionHeading(doc, "TERMS & CONDITIONS", y);
      doc.setFont(FF, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...h2r(B.muted));
      const tl = doc.splitTextToSize(safe(invoice.termsAndConditions), CW);
      doc.text(tl, ML, y);
      y += tl.length * 3.8 + 5;
    }
  }

  // ── SIGNATURE BLOCK ───────────────────────────────────────────────────────
  // Sits in the bottom-right corner, above the footer.
  const sigH = 24;
  y = maybeNewPage(doc, logo, invoice, y, sigH + 8);

  // Place it flush to the safe bottom if there's extra space, else right after content
  const sigY = Math.min(Math.max(y + 4, SAFE_BOTTOM - sigH - 4), SAFE_BOTTOM - sigH - 2);
  const sigW = 72;
  const sigX = ML + CW - sigW;

  // Signature area background
  doc.setFillColor(...h2r(B.sky));
  doc.roundedRect(sigX, sigY, sigW, sigH, 2, 2, "F");

  // "For Company" label top
  doc.setFont(FF, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...h2r(B.navy));
  doc.text(`For ${safe(B.name)}`, sigX + sigW / 2, sigY + 5.5, { align: "center" });

  // Signature line
  doc.setDrawColor(...h2r(B.border));
  doc.setLineWidth(0.5);
  doc.line(sigX + 8, sigY + 17, sigX + sigW - 8, sigY + 17);

  // "Authorised Signatory" label
  doc.setFont(FF, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...h2r(B.muted));
  doc.text("Authorised Signatory", sigX + sigW / 2, sigY + 21, { align: "center" });

  // ── FOOTERS ───────────────────────────────────────────────────────────────
  drawAllFooters(doc);

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const slug = (s) =>
    safe(String(s || "")).replace(/[^a-zA-Z0-9_.\- ]/g, "_").trim() || "unknown";

  doc.save(
    `Invoice_${slug(invoice.invoiceNumber || "draft")}_${slug(invoice.customerName || "customer")}.pdf`,
  );
}