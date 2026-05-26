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
  sky:     "#E8F0FE",
  ink:     "#0F172A",
  body:    "#1E293B",
  muted:   "#64748B",
  border:  "#CBD5E1",
  row:     "#F8FAFC",
  green:   "#15803D",
  red:     "#B91C1C",
};

// ─── Page geometry ────────────────────────────────────────────────────────────
const PW = 210, PH = 297;
const ML = 14,  MR = 14;
const CW = PW - ML - MR;        // 182 mm usable width
const FOOTER_H    = 18;
const FOOTER_Y    = PH - FOOTER_H;   // 279 mm
const SAFE_BOTTOM = FOOTER_Y - 6;    // stop content here

// ─── Colour helper ────────────────────────────────────────────────────────────
const h2r = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// ─── Formatting ───────────────────────────────────────────────────────────────
const fmt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", {
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

// ─── Custom font loader (graceful fallback to Helvetica) ─────────────────────
// Drops Inter as the active typeface when /public/fonts/Inter-Regular.ttf and
// Inter-Bold.ttf are available. Otherwise stays on Helvetica silently.
let FONT_FAMILY = "helvetica";
const tryLoadFont = async (doc, url, fontName, style) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = typeof btoa === "function" ? btoa(bin) : null;
    if (!base64) return false;
    const file = url.split("/").pop();
    doc.addFileToVFS(file, base64);
    doc.addFont(file, fontName, style);
    return true;
  } catch {
    return false;
  }
};
const installCustomFonts = async (doc) => {
  const okR = await tryLoadFont(doc, "/fonts/Inter-Regular.ttf", "Inter", "normal");
  const okB = await tryLoadFont(doc, "/fonts/Inter-Bold.ttf",    "Inter", "bold");
  if (okR && okB) FONT_FAMILY = "Inter";
};

// ─── Logo loader ──────────────────────────────────────────────────────────────
const loadLogo = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width  = img.naturalWidth  || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = "/adwait-logo.jpg";
  });

// ─── Header ───────────────────────────────────────────────────────────────────
// Compact gradient brand band: logo + brand block on the left, "TAX INVOICE"
// title + invoice number + date stacked tightly on the right. The meta lines
// live inside the band so the body starts immediately below.
// Content must never start before HEADER_END_Y.
const HEADER_BAND_H = 28;
const HEADER_END_Y = HEADER_BAND_H + 6; // 34 mm

// Simulate a vertical navy → blue gradient using stacked thin rectangles.
const drawGradientBand = (doc, x, y, w, h) => {
  const steps = 24;
  const [r1, g1, b1] = h2r(B.navy);
  const [r2, g2, b2] = h2r(B.blue);
  const stepH = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * stepH, w, stepH + 0.1, "F");
  }
};

const drawHeader = (doc, logo, invoice = {}) => {
  drawGradientBand(doc, 0, 0, PW, HEADER_BAND_H);

  // Logo on the left — 18×18 mm fits inside the 28 mm band with room to spare.
  if (logo) doc.addImage(logo, "PNG", ML, 5, 18, 18);
  const textX = ML + (logo ? 22 : 0);

  // Brand name + tagline (left column)
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(B.name, textX, 12);

  doc.setFont(FONT_FAMILY, "italic");
  doc.setFontSize(7);
  doc.setTextColor(...h2r("#DBEAFE"));
  doc.text(B.tagline, textX, 16.5);

  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...h2r("#BFDBFE"));
  doc.text(`${B.address}  |  ${B.phone}`, textX, 21);
  doc.text(`${B.email}  |  ${B.web}`,     textX, 24.5);

  // Right column — "TAX INVOICE" eyebrow + meta key/value lines.
  // Keys are right-aligned to a virtual gutter so values line up cleanly.
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", PW - MR, 12, { align: "right" });

  const metaRight = PW - MR;
  const metaPairs = [
    ["No.",    invoice.invoiceNumber || "—"],
    ["Date",   fmt(invoice.invoiceDate)],
  ];
  if (invoice.dueDate)    metaPairs.push(["Due",      fmt(invoice.dueDate)]);
  if (invoice.bookingRef) metaPairs.push(["Booking",  String(invoice.bookingRef)]);

  let metaY = 17;
  doc.setFontSize(7);
  metaPairs.forEach(([k, v]) => {
    doc.setFont(FONT_FAMILY, "normal");
    doc.setTextColor(...h2r("#BFDBFE"));
    doc.text(`${k}:`, metaRight - 30, metaY, { align: "right" });
    doc.setFont(FONT_FAMILY, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(String(v), metaRight, metaY, { align: "right" });
    metaY += 3.6;
  });

  // Thin accent divider just below the band
  doc.setDrawColor(...h2r(B.blue));
  doc.setLineWidth(0.6);
  doc.line(ML, HEADER_BAND_H + 2.5, ML + CW, HEADER_BAND_H + 2.5);

  return HEADER_END_Y;
};

// ─── Faded logo watermark ─────────────────────────────────────────────────────
// Centered, low-opacity logo placed once per page, behind body content.
// Uses jsPDF GState — falls back to a faded text mark when GState is absent.
const drawWatermark = (doc, logo) => {
  if (!logo) return;
  try {
    const GState = doc.GState || (doc.constructor && doc.constructor.GState);
    if (GState) {
      const gs = new GState({ opacity: 0.05 });
      doc.setGState(gs);
      const size = 110;
      const x = (PW - size) / 2;
      const y = (PH - size) / 2;
      doc.addImage(logo, "PNG", x, y, size, size);
      doc.setGState(new GState({ opacity: 1 }));
    }
  } catch {
    // Silent fallback — leave watermark off rather than break the document.
  }
};

// ─── Footer on every page ─────────────────────────────────────────────────────
const drawAllFooters = (doc) => {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const FY = PH - FOOTER_H;
    // Two-tone footer: thin brighter blue accent above the navy bar
    doc.setFillColor(...h2r(B.blue));
    doc.rect(0, FY, PW, 1.2, "F");
    doc.setFillColor(...h2r(B.navy));
    doc.rect(0, FY + 1.2, PW, FOOTER_H - 1.2, "F");

    doc.setFont(FONT_FAMILY, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Thank you for your business!", PW / 2, FY + 7, { align: "center" });

    doc.setFont(FONT_FAMILY, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...h2r("#BFDBFE"));
    doc.text(
      `${B.phone}   ·   ${B.email}   ·   ${B.web}`,
      PW / 2, FY + 12.5, { align: "center" },
    );

    if (total > 1) {
      doc.setFont(FONT_FAMILY, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...h2r("#BFDBFE"));
      doc.text(`Page ${p} of ${total}`, PW - MR, FY + 12.5, { align: "right" });
    }
  }
};

// ─── maybeNewPage ─────────────────────────────────────────────────────────────
const maybeNewPage = (doc, logo, invoice, y, needed = 20) => {
  if (y + needed > SAFE_BOTTOM) {
    doc.addPage();
    drawWatermark(doc, logo);
    return drawHeader(doc, logo, invoice);
  }
  return y;
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const divider = (doc, y, col = B.border, thick = 0.25) => {
  doc.setDrawColor(...h2r(col));
  doc.setLineWidth(thick);
  doc.line(ML, y, ML + CW, y);
};

const sectionLabel = (doc, text, y) => {
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...h2r(B.blue));
  doc.text(text, ML, y);
};

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateInvoicePDF(invoice = {}) {
  if (!invoice || typeof invoice !== "object") {
    console.error("[generateInvoicePDF] Invalid invoice object");
    return;
  }

  const logo = await loadLogo();
  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Best-effort: register Inter as the document font. Silently no-ops if the
  // TTFs aren't present in /public/fonts/ — Helvetica remains the fallback.
  await installCustomFonts(doc);

  // Page-1 watermark, then header. Meta lines live inside the header band now.
  drawWatermark(doc, logo);
  let y = drawHeader(doc, logo, invoice);

  // ── Bill To card ──────────────────────────────────────────────────────────
  // Rounded card with a brand-color left stripe holds the customer block.
  // Status pill sits on the top-right corner so the eye lands on it quickly.
  const billLines = [];
  const contactLine = [
    invoice.customerMobile && `Ph: ${invoice.customerMobile}`,
    invoice.customerEmail,
  ].filter(Boolean).join("   |   ");
  if (contactLine) billLines.push(contactLine);
  if (invoice.customerAddress) {
    const aLines = doc.splitTextToSize(invoice.customerAddress, CW * 0.62);
    aLines.forEach((l) => billLines.push(l));
  }
  const billCardH = 14 + billLines.length * 4.2;

  doc.setFillColor(...h2r("#FFFFFF"));
  doc.setDrawColor(...h2r(B.border));
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, billCardH, 2, 2, "FD");
  // Left brand stripe
  doc.setFillColor(...h2r(B.navy));
  doc.rect(ML, y, 2, billCardH, "F");

  // Section label
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...h2r(B.blue));
  doc.text("BILL TO", ML + 6, y + 5);

  // Customer name
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...h2r(B.ink));
  doc.text(invoice.customerName || "—", ML + 6, y + 10.5);

  // Contact + address lines
  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...h2r(B.muted));
  let bLineY = y + 15;
  billLines.forEach((line) => {
    doc.text(line, ML + 6, bLineY);
    bLineY += 4.2;
  });

  // Status pill on the right side of the card
  const statusLabel = String(invoice.status || "Draft").toUpperCase();
  const isPaid = /paid/i.test(invoice.status || "") && !/un|partial/i.test(invoice.status || "");
  const pillColor = isPaid ? B.green : B.blue;
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(7);
  const pillW = doc.getTextWidth(statusLabel) + 6;
  const pillX = ML + CW - pillW - 6;
  const pillY = y + 4;
  doc.setFillColor(...h2r(pillColor));
  doc.roundedRect(pillX, pillY, pillW, 5.5, 1.2, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pillX + pillW / 2, pillY + 3.8, { align: "center" });

  y += billCardH + 6;

  // ── Line items — full-width autoTable ─────────────────────────────────────
  // Column widths must sum to CW = 182:
  // 9 + 68 + 10 + 26 + 20 + 13 + 36 = 182 ✓
  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

  // Section heading above the line-items table
  sectionLabel(doc, "ITEMS & SERVICES", y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Qty", "Unit Price", "Discount", "GST", "Amount"]],
    body: lineItems.map((item, i) => {
      const disc =
        safeNum(item.discountValue) > 0
          ? item.discountType === "percentage"
            ? `${item.discountValue}%`
            : rs(item.discountValue)
          : "—";
      return [
        i + 1,
        item.itemName || item.description || "—",
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
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    bodyStyles: {
      font: FONT_FAMILY,
      fontSize: 8.5,
      textColor: h2r(B.body),
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: h2r(B.row) },
    tableWidth: CW,
    columnStyles: {
      0: { cellWidth: 9,  halign: "center" },
      1: { cellWidth: 68 },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 13, halign: "center" },
      6: { cellWidth: 36, halign: "right" },
    },
    margin: { left: ML, right: MR },
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
          // Reset font state explicitly — autoTable left the cell in bold
          // and jsPDF can retain that weight when we draw extra text inside
          // the same cell. Force normal weight on the same family, then draw.
          doc.setFont(FONT_FAMILY, "normal");
          doc.setFontSize(7);
          doc.setTextColor(...h2r(B.muted));
          const descLines = doc.splitTextToSize(
            item.description,
            d.cell.width - 6,
          );
          const descY = d.cell.y + d.cell.padding("top") + 7;
          doc.text(descLines, d.cell.x + 3, descY);
        }
      }
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const item = lineItems[d.row.index];
        if (item?.itemName && item?.description) {
          // Estimate wrapped lines using the column width (68mm − 6 padding)
          // converted at ~2 chars/mm for 7pt text. Round up generously so the
          // cell is tall enough for the bold name + the secondary lines.
          const charsPerLine = Math.max(20, Math.floor((68 - 6) * 2));
          const lines = Math.max(
            1,
            Math.ceil(item.description.length / charsPerLine),
          );
          d.cell.styles.minCellHeight = 7 + lines * 3.8 + 4;
        }
      }
    },
    didDrawPage: () => {
      drawWatermark(doc, logo);
      y = drawHeader(doc, logo, invoice);
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Totals — full-width autoTable ─────────────────────────────────────────
  // Label col + Amount col = CW.
  const LABEL_W  = CW * 0.65;
  const AMOUNT_W = CW - LABEL_W; // ~63.7 mm

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

  y = maybeNewPage(doc, logo, invoice, y, totRows.length * 9 + 28);

  // Totals occupy the right ~half of the page so the lower-left can hold
  // a stamp / signature block beside the grand-total ribbon.
  const TOT_W = 90;
  const TOT_X = ML + CW - TOT_W;

  // Sub-total rows (right aligned to half page)
  autoTable(doc, {
    startY: y,
    body: totRows.map(([lbl, val, isNeg]) => [
      {
        content: lbl,
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
      font: FONT_FAMILY,
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
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

  // Grand Total ribbon — accent stripe + larger total, brand-color navy bar.
  const ribbonH = 14;
  // Left accent stripe (brighter blue) flush against the navy bar
  doc.setFillColor(...h2r(B.blue));
  doc.rect(TOT_X, y, 3, ribbonH, "F");
  // Main navy bar
  doc.setFillColor(...h2r(B.navy));
  doc.rect(TOT_X + 3, y, TOT_W - 3, ribbonH, "F");
  // Labels
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...h2r("#BFDBFE"));
  doc.text("GRAND TOTAL", TOT_X + 7, y + 5.5);
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    rs(safeNum(invoice.grandTotal)),
    TOT_X + TOT_W - 4,
    y + 10.5,
    { align: "right" },
  );

  y += ribbonH + 8;

  // ── Payment summary ────────────────────────────────────────────────────────
  const payments    = Array.isArray(invoice.payments) ? invoice.payments : [];
  const hasPayments = payments.length > 0 || safeNum(invoice.amountReceived) > 0;

  if (hasPayments) {
    y = maybeNewPage(doc, logo, invoice, y, 36);
    divider(doc, y);
    y += 5;

    sectionLabel(doc, "PAYMENT RECEIVED", y);
    y += 4;

    if (payments.length > 0) {
      // 28 + 76 + 46 + 32 = 182 = CW ✓
      autoTable(doc, {
        startY: y,
        head: [["Date", "Account / Mode", "Reference", "Amount"]],
        body: payments.map((p) => [
          fmt(p.date),
          p.paymentAccountName || p.mode || "—",
          p.reference || "—",
          rs(safeNum(p.amount)),
        ]),
        theme: "plain",
        headStyles: {
          fillColor: h2r("#334155"),
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: h2r(B.body),
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        alternateRowStyles: { fillColor: h2r(B.row) },
        tableWidth: CW,
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 76 },
          2: { cellWidth: 46 },
          3: { cellWidth: 32, halign: "right" },
        },
        margin: { left: ML, right: MR },
        didDrawPage: () => {
          drawWatermark(doc, logo);
          y = drawHeader(doc, logo, invoice);
        },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Amount received + Balance due — full-width 2-row table
    y = maybeNewPage(doc, logo, invoice, y, 24);
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
          { content: "Balance Due", styles: { textColor: h2r(B.muted), fontStyle: "normal" } },
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
        fontSize: 9,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        fillColor: h2r(fullyPaid ? "#F0FDF4" : "#FFF7ED"),
      },
      tableWidth: CW,
      columnStyles: {
        0: { cellWidth: LABEL_W },
        1: { cellWidth: AMOUNT_W },
      },
      margin: { left: ML, right: MR },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Notes & T&C ───────────────────────────────────────────────────────────
  if (invoice.notes || invoice.termsAndConditions) {
    y = maybeNewPage(doc, logo, invoice, y, 20);
    divider(doc, y);
    y += 5;

    if (invoice.notes) {
      y = maybeNewPage(doc, logo, invoice, y, 15);
      sectionLabel(doc, "NOTES", y);
      y += 4;
      doc.setFont(FONT_FAMILY, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...h2r(B.body));
      const nL = doc.splitTextToSize(invoice.notes, CW);
      doc.text(nL, ML, y);
      y += nL.length * 4 + 3;
    }

    if (invoice.termsAndConditions) {
      y = maybeNewPage(doc, logo, invoice, y, 15);
      sectionLabel(doc, "TERMS & CONDITIONS", y);
      y += 4;
      doc.setFont(FONT_FAMILY, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...h2r(B.muted));
      const tL = doc.splitTextToSize(invoice.termsAndConditions, CW);
      doc.text(tL, ML, y);
      y += tL.length * 3.6 + 3;
    }
  }

  // ── Signature block ──────────────────────────────────────────────────────
  // Right-aligned signatory line + company name. Drops to the next page if
  // there isn't room above the footer.
  const signatureBlockH = 22;
  y = maybeNewPage(doc, logo, invoice, y, signatureBlockH + 6);
  const sigY = Math.max(y + 4, SAFE_BOTTOM - signatureBlockH - 2);
  const sigW = 70;
  const sigX = ML + CW - sigW;
  doc.setDrawColor(...h2r(B.border));
  doc.setLineWidth(0.4);
  doc.line(sigX, sigY + 12, sigX + sigW, sigY + 12);
  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...h2r(B.muted));
  doc.text("Authorised Signatory", sigX + sigW / 2, sigY + 16, { align: "center" });
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...h2r(B.ink));
  doc.text(`For ${B.name}`, sigX + sigW / 2, sigY + 20, { align: "center" });

  // ── Footers last ──────────────────────────────────────────────────────────
  drawAllFooters(doc);

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = (s) =>
    (s || "").replace(/[^a-zA-Z0-9_.\- ]/g, "_").trim() || "unknown";
  doc.save(
    `Invoice_${safeName(invoice.invoiceNumber || "draft")}_${safeName(invoice.customerName || "customer")}.pdf`,
  );
}