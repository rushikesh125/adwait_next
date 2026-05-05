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
// Navy stripe (0–8 mm) + logo (10–34 mm) + divider (38 mm).
// Content must never start before HEADER_END_Y = 44 mm.
const HEADER_END_Y = 44;

const drawHeader = (doc, logo) => {
  // Navy top stripe
  doc.setFillColor(...h2r(B.navy));
  doc.rect(0, 0, PW, 8, "F");

  // Logo box: x=ML, y=10, 24×24 mm — entirely below stripe, entirely above divider
  if (logo) doc.addImage(logo, "PNG", ML, 10, 24, 24);
  const textX = ML + (logo ? 28 : 0);

  // Company name at y=19 (baseline) — clear of stripe top at 8 mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...h2r(B.navy));
  doc.text(B.name, textX, 19);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...h2r(B.muted));
  doc.text(B.tagline, textX, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...h2r(B.muted));
  doc.text(`${B.address}  |  ${B.phone}`, textX, 29);
  doc.text(`${B.email}  |  ${B.web}`,     textX, 33);

  // "Tax Invoice" top-right — same band as company name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...h2r(B.muted));
  doc.text("Tax Invoice", PW - MR, 19, { align: "right" });

  // Divider at 38 mm
  doc.setDrawColor(...h2r(B.navy));
  doc.setLineWidth(0.5);
  doc.line(ML, 38, ML + CW, 38);

  // Return the Y where content begins — always 44 mm, 6 mm below divider
  return HEADER_END_Y;
};

// ─── Footer on every page ─────────────────────────────────────────────────────
const drawAllFooters = (doc) => {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const FY = PH - FOOTER_H;
    doc.setFillColor(...h2r(B.navy));
    doc.rect(0, FY, PW, FOOTER_H, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...h2r("#93C5FD"));
    doc.text(
      `${B.name}   |   ${B.address}   |   ${B.phone}   |   ${B.web}`,
      PW / 2, FY + 5, { align: "center" },
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Thank you for your business!", PW / 2, FY + 12, { align: "center" });

    if (total > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...h2r("#93C5FD"));
      doc.text(`Page ${p} of ${total}`, PW - MR, FY + 12, { align: "right" });
    }
  }
};

// ─── maybeNewPage ─────────────────────────────────────────────────────────────
const maybeNewPage = (doc, logo, y, needed = 20) => {
  if (y + needed > SAFE_BOTTOM) {
    doc.addPage();
    return drawHeader(doc, logo);
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
  doc.setFont("helvetica", "bold");
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

  // Draw page-1 header; y starts at 44 mm — clear of all header elements
  let y = drawHeader(doc, logo);

  // ── "TAX INVOICE" title ────────────────────────────────────────────────────
  // Drawn at y (44 mm), then y advances 10 mm before next element
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...h2r(B.blue));
  doc.text("TAX INVOICE", ML, y);
  y += 10;

  // ── Invoice meta — full-width autoTable ───────────────────────────────────
  // Two columns: label (left) + value (right). Together they equal CW = 182 mm.
  const metaRows = [
    ["Invoice No.",  invoice.invoiceNumber || "—"],
    ["Invoice Date", fmt(invoice.invoiceDate)],
  ];
  if (invoice.dueDate)    metaRows.push(["Due Date",     fmt(invoice.dueDate)]);
  if (invoice.bookingRef) metaRows.push(["Booking Ref.", invoice.bookingRef]);
  metaRows.push(["Status", invoice.status || "Draft"]);

  autoTable(doc, {
    startY: y,
    body: metaRows.map(([lbl, val]) => [
      { content: lbl, styles: { textColor: h2r(B.muted), fontStyle: "normal" } },
      { content: String(val), styles: { textColor: h2r(B.body), fontStyle: "bold", halign: "right" } },
    ]),
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
    },
    tableWidth: CW,
    columnStyles: {
      0: { cellWidth: CW * 0.45 },
      1: { cellWidth: CW * 0.55 },
    },
    margin: { left: ML, right: MR },
  });

  y = doc.lastAutoTable.finalY + 5;

  // ── Thick divider ─────────────────────────────────────────────────────────
  divider(doc, y, B.navy, 0.6);
  y += 7;

  // ── Bill To ───────────────────────────────────────────────────────────────
  sectionLabel(doc, "BILL TO", y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...h2r(B.ink));
  doc.text(invoice.customerName || "—", ML, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...h2r(B.muted));

  const contactLine = [
    invoice.customerMobile && `Ph: ${invoice.customerMobile}`,
    invoice.customerEmail,
  ].filter(Boolean).join("   |   ");

  if (contactLine) { doc.text(contactLine, ML, y); y += 4.5; }

  if (invoice.customerAddress) {
    const aLines = doc.splitTextToSize(invoice.customerAddress, CW * 0.65);
    doc.text(aLines, ML, y);
    y += aLines.length * 4;
  }

  y += 4;
  divider(doc, y);
  y += 7;

  // ── Line items — full-width autoTable ─────────────────────────────────────
  // Column widths must sum to CW = 182:
  // 9 + 68 + 10 + 26 + 20 + 13 + 36 = 182 ✓
  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

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
      fillColor: h2r(B.ink),
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: h2r(B.body),
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
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
          const descLines = doc.splitTextToSize(item.description, d.cell.width - 6);
          const descY = d.cell.y + d.cell.padding("top") + 4.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...h2r(B.muted));
          doc.text(descLines, d.cell.x + 3, descY);
        }
      }
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const item = lineItems[d.row.index];
        if (item?.itemName && item?.description) {
          const lines = Math.ceil(item.description.length / 62);
          d.cell.styles.minCellHeight = 5 + lines * 3.5 + 7;
        }
      }
    },
    didDrawPage: () => { y = drawHeader(doc, logo); },
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

  y = maybeNewPage(doc, logo, y, totRows.length * 9 + 22);

  // Sub-total rows
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
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      fillColor: h2r(B.row),
    },
    tableWidth: CW,
    columnStyles: {
      0: { cellWidth: LABEL_W },
      1: { cellWidth: AMOUNT_W },
    },
    margin: { left: ML, right: MR },
  });

  y = doc.lastAutoTable.finalY;

  // Grand Total bar — immediately after sub-totals, no gap
  autoTable(doc, {
    startY: y,
    body: [[
      {
        content: "GRAND TOTAL",
        styles: {
          fillColor: h2r(B.navy),
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "left",
        },
      },
      {
        content: rs(safeNum(invoice.grandTotal)),
        styles: {
          fillColor: h2r(B.navy),
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "right",
        },
      },
    ]],
    theme: "plain",
    styles: { cellPadding: { top: 4.5, bottom: 4.5, left: 4, right: 4 } },
    tableWidth: CW,
    columnStyles: {
      0: { cellWidth: LABEL_W },
      1: { cellWidth: AMOUNT_W },
    },
    margin: { left: ML, right: MR },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Payment summary ────────────────────────────────────────────────────────
  const payments    = Array.isArray(invoice.payments) ? invoice.payments : [];
  const hasPayments = payments.length > 0 || safeNum(invoice.amountReceived) > 0;

  if (hasPayments) {
    y = maybeNewPage(doc, logo, y, 36);
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
        didDrawPage: () => { y = drawHeader(doc, logo); },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Amount received + Balance due — full-width 2-row table
    y = maybeNewPage(doc, logo, y, 24);
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
    y = maybeNewPage(doc, logo, y, 20);
    divider(doc, y);
    y += 5;

    if (invoice.notes) {
      y = maybeNewPage(doc, logo, y, 15);
      sectionLabel(doc, "NOTES", y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...h2r(B.body));
      const nL = doc.splitTextToSize(invoice.notes, CW);
      doc.text(nL, ML, y);
      y += nL.length * 4 + 3;
    }

    if (invoice.termsAndConditions) {
      y = maybeNewPage(doc, logo, y, 15);
      sectionLabel(doc, "TERMS & CONDITIONS", y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...h2r(B.muted));
      const tL = doc.splitTextToSize(invoice.termsAndConditions, CW);
      doc.text(tL, ML, y);
    }
  }

  // ── Footers last ──────────────────────────────────────────────────────────
  drawAllFooters(doc);

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = (s) =>
    (s || "").replace(/[^a-zA-Z0-9_.\- ]/g, "_").trim() || "unknown";
  doc.save(
    `Invoice_${safeName(invoice.invoiceNumber || "draft")}_${safeName(invoice.customerName || "customer")}.pdf`,
  );
}