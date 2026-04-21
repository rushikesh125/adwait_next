import { jsPDF } from "jspdf";
import "jspdf-autotable";

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
  green:   "#1B5E20",
};

const hex2rgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const fmt = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const rupee = (n) => {
  const num = Number(n) || 0;
  return `Rs. ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const loadLogoBase64 = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
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

export async function generateInvoicePDF(invoice = {}) {
  const logoBase64 = await loadLogoBase64();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PW = 210;
  const ML = 15;
  const MR = 15;
  const CW = PW - ML - MR;
  let y = 15;

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

  const fillRect = (x, yy, w, h, color) => {
    doc.setFillColor(...hex2rgb(color));
    doc.rect(x, yy, w, h, "F");
  };

  /* ── HEADER ─────────────────────────────────────────────────────────── */
  fillRect(ML, y, CW, 28, BRAND.primary);

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", ML + 3, y + 3, 18, 18);
  }

  setFont("bold", 18, "#FFFFFF");
  doc.text(BRAND.name, ML + 26, y + 11);
  setFont("normal", 8, "#BBDEFB");
  doc.text(`${BRAND.address}  |  ${BRAND.phone}`, ML + 26, y + 17);
  doc.text(`${BRAND.email}  |  ${BRAND.web}`, ML + 26, y + 22);

  // TAX INVOICE label on right
  setFont("bold", 16, "#FFFFFF");
  doc.text("TAX INVOICE", ML + CW - 3, y + 12, { align: "right" });

  y += 32;

  /* ── INVOICE META ────────────────────────────────────────────────────── */
  const metaLeft = ML;
  const metaRight = ML + CW / 2 + 5;

  // Left: Bill To
  setFont("bold", 7, BRAND.muted);
  doc.text("BILL TO", metaLeft, y);
  y += 4;
  setFont("bold", 11, BRAND.text);
  doc.text(invoice.customerName || "—", metaLeft, y);
  y += 5;
  setFont("normal", 9, BRAND.muted);
  if (invoice.customerMobile) {
    doc.text(`Ph: ${invoice.customerMobile}`, metaLeft, y);
    y += 4;
  }
  if (invoice.customerEmail) {
    doc.text(`Email: ${invoice.customerEmail}`, metaLeft, y);
    y += 4;
  }
  if (invoice.customerAddress) {
    const lines = doc.splitTextToSize(invoice.customerAddress, CW / 2 - 10);
    doc.text(lines, metaLeft, y);
    y += lines.length * 4;
  }

  // Right: Invoice details box
  const boxY = y - (invoice.customerAddress ? (invoice.customerAddress.split("\n").length * 4 + 13) : 13) - 4;
  const detailRows = [
    ["Invoice No.", invoice.invoiceNumber || "—"],
    ["Invoice Date", fmt(invoice.invoiceDate)],
    ["Due Date", fmt(invoice.dueDate) || "—"],
    ["Status", invoice.status || "Draft"],
  ];
  if (invoice.bookingRef) detailRows.push(["Booking Ref.", invoice.bookingRef]);

  fillRect(metaRight, boxY, CW / 2 - 5, detailRows.length * 7 + 6, BRAND.light);

  let boxRowY = boxY + 6;
  detailRows.forEach(([label, val]) => {
    setFont("normal", 8, BRAND.muted);
    doc.text(label, metaRight + 4, boxRowY);
    setFont("bold", 8, BRAND.text);
    doc.text(String(val), metaRight + CW / 2 - 9, boxRowY, { align: "right" });
    boxRowY += 7;
  });

  y += 6;
  rule(0.3, BRAND.rule, y);
  y += 5;

  /* ── LINE ITEMS TABLE ────────────────────────────────────────────────── */
  const lineItems = invoice.lineItems || [];

  const tableHead = [["#", "Description", "Qty", "Unit Price", "Discount", "GST %", "Amount"]];
  const tableBody = lineItems.map((item, idx) => {
    const discStr =
      item.discountValue > 0
        ? item.discountType === "percentage"
          ? `${item.discountValue}%`
          : rupee(item.discountValue)
        : "—";

    // Build description cell: item name on first line, details below
    const namePart = item.itemName || "";
    const descPart = item.description || "";
    const descCell = [namePart, descPart].filter(Boolean).join("\n") || "—";

    return [
      idx + 1,
      descCell,
      item.quantity,
      rupee(item.unitPrice),
      discStr,
      item.gstRate > 0 ? `${item.gstRate}%` : "Nil",
      rupee(item.total),
    ];
  });

  doc.autoTable({
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: hex2rgb(BRAND.primary),
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: hex2rgb(BRAND.text) },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 62 },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 28, halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: ML, right: MR },
    didParseCell: (data) => {
      // Bold the item name (first line) in description column
      if (data.section === "body" && data.column.index === 1) {
        const lineItems = invoice.lineItems || [];
        const item = lineItems[data.row.index];
        if (item?.itemName) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawCell: (data) => {
      // Re-draw description in normal weight below the bold item name
      if (data.section === "body" && data.column.index === 1) {
        const lineItems = invoice.lineItems || [];
        const item = lineItems[data.row.index];
        if (item?.itemName && item?.description) {
          const x = data.cell.x + 2;
          const nameLineHeight = 4.5;
          const y0 = data.cell.y + data.cell.padding("top") + nameLineHeight;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...hex2rgb(BRAND.muted));
          const descLines = doc.splitTextToSize(item.description, data.cell.width - 4);
          doc.text(descLines, x, y0);
          // Reset
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...hex2rgb(BRAND.text));
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  /* ── TOTALS ──────────────────────────────────────────────────────────── */
  const totalBoxW = 80;
  const totalBoxX = ML + CW - totalBoxW;

  const totalsRows = [["Subtotal", invoice.subtotal]];
  if (invoice.discountTotal > 0)
    totalsRows.push(["Discount", -invoice.discountTotal]);

  totalsRows.push(["Taxable Amount", invoice.taxableAmount]);

  if (invoice.gstType === "inter") {
    if (invoice.igst > 0) totalsRows.push([`IGST`, invoice.igst]);
  } else {
    if (invoice.cgst > 0) totalsRows.push([`CGST`, invoice.cgst]);
    if (invoice.sgst > 0) totalsRows.push([`SGST`, invoice.sgst]);
  }

  fillRect(totalBoxX, y, totalBoxW, totalsRows.length * 6.5 + 14, BRAND.light);

  let ty = y + 5;
  totalsRows.forEach(([label, val]) => {
    setFont("normal", 8.5, BRAND.muted);
    doc.text(label, totalBoxX + 4, ty);
    setFont("bold", 8.5, Number(val) < 0 ? "#B71C1C" : BRAND.text);
    doc.text(rupee(Math.abs(Number(val))), totalBoxX + totalBoxW - 4, ty, { align: "right" });
    ty += 6.5;
  });

  rule(0.4, BRAND.primary, ty);
  ty += 5;

  fillRect(totalBoxX, ty - 1, totalBoxW, 9, BRAND.primary);
  setFont("bold", 10, "#FFFFFF");
  doc.text("Grand Total", totalBoxX + 4, ty + 5.5);
  doc.text(rupee(invoice.grandTotal), totalBoxX + totalBoxW - 4, ty + 5.5, { align: "right" });

  ty += 12;

  /* ── PAYMENT SUMMARY ─────────────────────────────────────────────────── */
  if ((invoice.amountReceived || 0) > 0 || (invoice.payments || []).length > 0) {
    y = Math.max(y + totalsRows.length * 6.5 + 20, ty + 4);

    setFont("bold", 8, BRAND.muted);
    doc.text("PAYMENT RECEIVED", ML, y);
    y += 4;

    const payRows = (invoice.payments || []).map((p) => [
      fmt(p.date),
      p.paymentAccountName || p.mode || "—",
      p.reference || "—",
      rupee(p.amount),
    ]);

    if (payRows.length > 0) {
      doc.autoTable({
        startY: y,
        head: [["Date", "Account / Mode", "Reference", "Amount"]],
        body: payRows,
        theme: "striped",
        headStyles: {
          fillColor: hex2rgb(BRAND.accent),
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 55 },
          2: { cellWidth: 45 },
          3: { cellWidth: 30, halign: "right" },
        },
        margin: { left: ML, right: MR },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Amount due box
    const dueBoxX = ML + CW - 80;
    fillRect(dueBoxX, y, 80, 16, invoice.amountDue <= 0 ? "#E8F5E9" : "#FFF3E0");
    setFont("normal", 8.5, BRAND.muted);
    doc.text("Amount Received", dueBoxX + 4, y + 6);
    setFont("bold", 8.5, BRAND.green);
    doc.text(rupee(invoice.amountReceived), dueBoxX + 76, y + 6, { align: "right" });
    setFont("normal", 8.5, BRAND.muted);
    doc.text("Balance Due", dueBoxX + 4, y + 12);
    setFont("bold", 8.5, invoice.amountDue > 0 ? "#B71C1C" : BRAND.green);
    doc.text(rupee(invoice.amountDue), dueBoxX + 76, y + 12, { align: "right" });

    y += 20;
  } else {
    y = ty + 4;
  }

  /* ── NOTES / T&C ─────────────────────────────────────────────────────── */
  if (invoice.notes) {
    y += 4;
    setFont("bold", 8, BRAND.muted);
    doc.text("NOTES", ML, y);
    y += 4;
    setFont("normal", 8, BRAND.text);
    const lines = doc.splitTextToSize(invoice.notes, CW);
    doc.text(lines, ML, y);
    y += lines.length * 4 + 2;
  }

  if (invoice.termsAndConditions) {
    setFont("bold", 8, BRAND.muted);
    doc.text("TERMS & CONDITIONS", ML, y);
    y += 4;
    setFont("normal", 7.5, BRAND.muted);
    const lines = doc.splitTextToSize(invoice.termsAndConditions, CW);
    doc.text(lines, ML, y);
    y += lines.length * 4;
  }

  /* ── FOOTER ──────────────────────────────────────────────────────────── */
  const footerY = 285;
  rule(0.3, BRAND.rule, footerY);
  setFont("normal", 7, BRAND.muted);
  doc.text(
    `${BRAND.name}  |  ${BRAND.address}  |  ${BRAND.phone}  |  ${BRAND.web}`,
    PW / 2,
    footerY + 4,
    { align: "center" }
  );
  doc.text("Thank you for your business!", PW / 2, footerY + 8, { align: "center" });

  const fileName = `Invoice_${invoice.invoiceNumber || "draft"}_${invoice.customerName || "customer"}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, "_");

  doc.save(fileName);
}
