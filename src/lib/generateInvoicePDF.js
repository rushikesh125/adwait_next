import { jsPDF } from "jspdf";
import "jspdf-autotable";

/* ── Brand ───────────────────────────────────────────────────────────────── */
const B = {
  name:    "Adwait Tours",
  tagline: "Your Trusted Travel Partner",
  address: "Nagpur, Maharashtra, India",
  phone:   "+91 9884798483",
  email:   "sales@adwaittours.com",
  web:     "www.adwaittours.com",
  // colours
  navy:    "#0D3B6E",   // deep header navy
  blue:    "#1565C0",   // primary accent
  sky:     "#E8F0FE",   // light tint
  ink:     "#0F172A",   // table header / dark text
  body:    "#1E293B",   // body text
  muted:   "#64748B",   // labels / secondary
  border:  "#CBD5E1",   // hairlines
  row:     "#F8FAFC",   // alternating row
  green:   "#15803D",
  red:     "#B91C1C",
};

const h2r = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const fmt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const rs = (n) => {
  const num = Number(n) || 0;
  return `Rs. ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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
    img.src = `/adwait-logo.jpg?v=${Date.now()}`;
  });

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function generateInvoicePDF(invoice = {}) {
  const logo = await loadLogo();
  const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PW = 210, PH = 297;
  const ML = 14, MR = 14;
  const CW = PW - ML - MR;   // 182 mm
  let y = 0;

  /* helpers */
  const sf = (style = "normal", size = 10, col = B.body) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...h2r(col));
  };
  const ln = (yy = y, thick = 0.3, col = B.border) => {
    doc.setDrawColor(...h2r(col));
    doc.setLineWidth(thick);
    doc.line(ML, yy, ML + CW, yy);
  };
  const box = (x, yy, w, h, fill, stroke = null) => {
    doc.setFillColor(...h2r(fill));
    doc.rect(x, yy, w, h, stroke ? "FD" : "F");
    if (stroke) { doc.setDrawColor(...h2r(stroke)); doc.setLineWidth(0.3); doc.rect(x, yy, w, h, "S"); }
  };

  /* ── TOP STRIPE ─────────────────────────────────────────────────────────── */
  doc.setFillColor(...h2r(B.navy));
  doc.rect(0, 0, PW, 8, "F");

  /* ── HEADER ─────────────────────────────────────────────────────────────── */
  y = 14;

  // Logo (left)
  if (logo) doc.addImage(logo, "PNG", ML, y, 26, 26);
  const cx = ML + (logo ? 30 : 0);

  // Company name & contact (left column)
  sf("bold", 17, B.navy);
  doc.text(B.name, cx, y + 9);
  sf("italic", 7.5, B.muted);
  doc.text(B.tagline, cx, y + 14);
  sf("normal", 7.5, B.muted);
  doc.text(B.address, cx, y + 19.5);
  doc.text(`${B.phone}   |   ${B.email}`, cx, y + 24);
  doc.text(B.web, cx, y + 28.5);

  // TAX INVOICE (right, large)
  sf("bold", 22, B.blue);
  doc.text("TAX INVOICE", PW - MR, y + 10, { align: "right" });

  // Invoice meta rows (right column)
  const metaW = 78;
  const metaX = PW - MR - metaW;
  const metaRows = [
    ["Invoice No.", invoice.invoiceNumber || "—"],
    ["Invoice Date", fmt(invoice.invoiceDate)],
  ];
  if (invoice.dueDate)    metaRows.push(["Due Date",    fmt(invoice.dueDate)]);
  if (invoice.bookingRef) metaRows.push(["Booking Ref.", invoice.bookingRef]);
  metaRows.push(["Status", invoice.status || "Draft"]);

  let mY = y + 16;
  metaRows.forEach(([lbl, val]) => {
    sf("normal", 7.5, B.muted);
    doc.text(lbl, metaX, mY);
    sf("bold", 7.5, B.body);
    doc.text(String(val), PW - MR, mY, { align: "right" });
    mY += 5;
  });

  y = Math.max(y + 32, mY + 3);

  /* ── PRIMARY DIVIDER ────────────────────────────────────────────────────── */
  doc.setDrawColor(...h2r(B.navy));
  doc.setLineWidth(0.6);
  doc.line(ML, y, ML + CW, y);
  y += 7;

  /* ── BILL TO ────────────────────────────────────────────────────────────── */
  sf("bold", 6.5, B.blue);
  doc.text("BILL TO", ML, y);
  y += 5;
  sf("bold", 12, B.ink);
  doc.text(invoice.customerName || "—", ML, y);
  y += 5.5;
  sf("normal", 8.5, B.muted);
  const contactLine = [
    invoice.customerMobile && `Ph: ${invoice.customerMobile}`,
    invoice.customerEmail,
  ].filter(Boolean).join("   |   ");
  if (contactLine) { doc.text(contactLine, ML, y); y += 4.5; }
  if (invoice.customerAddress) {
    const aLines = doc.splitTextToSize(invoice.customerAddress, CW * 0.55);
    doc.text(aLines, ML, y);
    y += aLines.length * 4;
  }
  y += 5;
  ln(y, 0.3, B.border);
  y += 7;

  /* ── LINE ITEMS TABLE ───────────────────────────────────────────────────── */
  const lineItems = invoice.lineItems || [];

  doc.autoTable({
    startY: y,
    head: [["#", "Description", "Qty", "Unit Price", "Discount", "GST", "Amount"]],
    body: lineItems.map((item, i) => {
      const disc = item.discountValue > 0
        ? (item.discountType === "percentage" ? `${item.discountValue}%` : rs(item.discountValue))
        : "—";
      const desc = [item.itemName || "", item.description || ""].filter(Boolean).join("\n") || "—";
      return [i + 1, desc, item.quantity, rs(item.unitPrice), disc, item.gstRate > 0 ? `${item.gstRate}%` : "Nil", rs(item.total)];
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
    columnStyles: {
      0: { cellWidth: 9,  halign: "center" },
      1: { cellWidth: 66 },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 13, halign: "center" },
      6: { cellWidth: 21, halign: "right" },
    },
    margin: { left: ML, right: MR },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        if (lineItems[d.row.index]?.itemName) d.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const item = lineItems[d.row.index];
        if (item?.itemName && item?.description) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...h2r(B.muted));
          const dLines = doc.splitTextToSize(item.description, d.cell.width - 6);
          doc.text(dLines, d.cell.x + 3, d.cell.y + d.cell.padding("top") + 5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...h2r(B.body));
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  /* ── TOTALS ─────────────────────────────────────────────────────────────── */
  const TW = 78, TX = ML + CW - TW;

  const totRows = [["Subtotal", invoice.subtotal, false]];
  if ((invoice.discountTotal || 0) > 0)
    totRows.push(["Discount", -(invoice.discountTotal), true]);
  totRows.push(["Taxable Amount", invoice.taxableAmount, false]);
  if (invoice.gstType === "inter") {
    if (invoice.igst > 0) totRows.push(["IGST", invoice.igst, false]);
  } else {
    if (invoice.cgst > 0) totRows.push(["CGST", invoice.cgst, false]);
    if (invoice.sgst > 0) totRows.push(["SGST", invoice.sgst, false]);
  }

  const rowH = 6.5;
  const totH = totRows.length * rowH + 4;

  // Subtle background card
  box(TX - 3, y - 2, TW + 3, totH + 14, B.row, B.border);

  let tY = y + 2;
  totRows.forEach(([lbl, val, isNeg]) => {
    sf("normal", 8, B.muted);
    doc.text(lbl, TX + 2, tY);
    sf("bold", 8, isNeg ? B.red : B.body);
    doc.text(isNeg ? `- ${rs(Math.abs(Number(val)))}` : rs(Number(val)), TX + TW - 2, tY, { align: "right" });
    tY += rowH;
  });

  // Divider above grand total
  doc.setDrawColor(...h2r(B.blue));
  doc.setLineWidth(0.5);
  doc.line(TX - 3, tY + 1, TX + TW, tY + 1);
  tY += 3;

  // Grand total bar
  box(TX - 3, tY, TW + 3, 11, B.navy);
  sf("bold", 10, "#FFFFFF");
  doc.text("GRAND TOTAL", TX + 2, tY + 7.5);
  doc.text(rs(invoice.grandTotal), TX + TW - 2, tY + 7.5, { align: "right" });

  y = tY + 15;

  /* ── PAYMENT SUMMARY ────────────────────────────────────────────────────── */
  const payments = invoice.payments || [];
  const hasPayments = payments.length > 0 || (invoice.amountReceived || 0) > 0;

  if (hasPayments) {
    ln(y, 0.3, B.border);
    y += 5;

    sf("bold", 6.5, B.blue);
    doc.text("PAYMENT RECEIVED", ML, y);
    y += 4;

    if (payments.length > 0) {
      doc.autoTable({
        startY: y,
        head: [["Date", "Account / Mode", "Reference", "Amount"]],
        body: payments.map((p) => [
          fmt(p.date),
          p.paymentAccountName || p.mode || "—",
          p.reference || "—",
          rs(p.amount),
        ]),
        theme: "plain",
        headStyles: {
          fillColor: h2r("#334155"),
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: "bold",
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: h2r(B.body),
          cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        },
        alternateRowStyles: { fillColor: h2r(B.row) },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 65 },
          2: { cellWidth: 40 },
          3: { cellWidth: 31, halign: "right" },
        },
        margin: { left: ML, right: MR },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Balance summary pill
    const bW = 80, bX = ML + CW - bW;
    const fullyPaid = (invoice.amountDue || 0) <= 0;
    box(bX, y, bW, 17, fullyPaid ? "#F0FDF4" : "#FFF7ED", fullyPaid ? "#86EFAC" : "#FED7AA");

    sf("normal", 8, B.muted);
    doc.text("Amount Received", bX + 4, y + 6);
    sf("bold", 8.5, B.green);
    doc.text(rs(invoice.amountReceived || 0), bX + bW - 4, y + 6, { align: "right" });

    sf("normal", 8, B.muted);
    doc.text("Balance Due", bX + 4, y + 13);
    sf("bold", 9, fullyPaid ? B.green : B.red);
    doc.text(rs(invoice.amountDue || 0), bX + bW - 4, y + 13, { align: "right" });

    y += 21;
  }

  /* ── NOTES & T&C ────────────────────────────────────────────────────────── */
  if (invoice.notes || invoice.termsAndConditions) {
    ln(y, 0.3, B.border);
    y += 5;
    if (invoice.notes) {
      sf("bold", 6.5, B.blue);
      doc.text("NOTES", ML, y);
      y += 4;
      sf("normal", 8, B.body);
      const nL = doc.splitTextToSize(invoice.notes, CW);
      doc.text(nL, ML, y);
      y += nL.length * 4 + 3;
    }
    if (invoice.termsAndConditions) {
      sf("bold", 6.5, B.blue);
      doc.text("TERMS & CONDITIONS", ML, y);
      y += 4;
      sf("normal", 7.5, B.muted);
      const tL = doc.splitTextToSize(invoice.termsAndConditions, CW);
      doc.text(tL, ML, y);
    }
  }

  /* ── FOOTER ─────────────────────────────────────────────────────────────── */
  const FY = PH - 16;
  doc.setFillColor(...h2r(B.navy));
  doc.rect(0, FY - 2, PW, 18, "F");

  sf("normal", 7, "#93C5FD");
  doc.text(
    `${B.name}   |   ${B.address}   |   ${B.phone}   |   ${B.web}`,
    PW / 2, FY + 3, { align: "center" }
  );
  sf("bold", 7.5, "#FFFFFF");
  doc.text("Thank you for choosing Adwait Tours!", PW / 2, FY + 9, { align: "center" });

  /* ── SAVE ────────────────────────────────────────────────────────────────── */
  const fileName = `Invoice_${invoice.invoiceNumber || "draft"}_${invoice.customerName || "customer"}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
  doc.save(fileName);
}
