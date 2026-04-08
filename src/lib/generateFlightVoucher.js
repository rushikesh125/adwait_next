import { jsPDF } from "jspdf";

const BRAND = {
  name: "Adwait Tours",
  phone: "+91 9884798483",
  email: "sales@adwaittours.com",
  web: "www.adwaittours.com",
  primary: "#0D47A1",
  light: "#E3F2FD",
  rule: "#BBDEFB",
  text: "#1A1A2E",
  muted: "#546E7A",
};

const fmtDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
};

const fmtDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const hex2rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const sanitise = (str) =>
  (str || "Flight")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "_");

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

export async function generateFlightVoucherPDF(voucher = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logoBase64 = await loadLogoBase64();
  const segments = Array.isArray(voucher.segments) ? voucher.segments : [];
  const passengers = (voucher.passengers || [])
    .map((p) => `${p.title ? `${p.title} ` : ""}${p.name || ""}`.trim())
    .filter(Boolean);

  const PW = 210;
  const PH = 297;
  const ML = 15;
  const MR = 15;
  const CW = PW - ML - MR;
  let y = 15;

  const setFont = (style = "normal", size = 10, color = BRAND.text) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...hex2rgb(color));
  };

  const rule = (thickness = 0.35, color = BRAND.rule, yy = y) => {
    doc.setDrawColor(...hex2rgb(color));
    doc.setLineWidth(thickness);
    doc.line(ML, yy, ML + CW, yy);
  };

  const filledRect = (x, yy, w, h, color) => {
    doc.setFillColor(...hex2rgb(color));
    doc.rect(x, yy, w, h, "F");
  };

  const borderedRect = (x, yy, w, h, stroke, fill = null) => {
    if (fill) {
      doc.setFillColor(...hex2rgb(fill));
      doc.rect(x, yy, w, h, "F");
    }
    doc.setDrawColor(...hex2rgb(stroke));
    doc.setLineWidth(0.35);
    doc.rect(x, yy, w, h, "S");
  };

  const ensureSpace = (needed = 20) => {
    if (y + needed <= PH - 25) return;
    doc.addPage();
    y = 15;
  };

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", ML, y, 42, 18);
  } else {
    filledRect(ML, y, 42, 18, BRAND.primary);
    setFont("bold", 13, "#FFFFFF");
    doc.text("ADWAIT", ML + 21, y + 8, { align: "center" });
    setFont("normal", 8, "#BBDEFB");
    doc.text("TOURS", ML + 21, y + 13.5, { align: "center" });
  }

  setFont("bold", 12, BRAND.primary);
  doc.text(BRAND.name, ML + CW, y + 5, { align: "right" });
  setFont("normal", 8, BRAND.muted);
  doc.text(`Phone: ${BRAND.phone}`, ML + CW, y + 10, { align: "right" });
  doc.text(`Email: ${BRAND.email}`, ML + CW, y + 14.5, { align: "right" });
  doc.text(`Web: ${BRAND.web}`, ML + CW, y + 19, { align: "right" });

  y += 24;
  rule(0.6, BRAND.primary);
  y += 6;

  setFont("bold", 16, BRAND.primary);
  doc.text("Flight Details Voucher", ML + CW / 2, y, { align: "center" });
  y += 7;

  setFont("normal", 8.5, BRAND.muted);
  doc.text(
    `Voucher No: ${voucher.voucherNumber || "-"}   |   Generated on: ${fmtDate(voucher.issueDate)}`,
    ML + CW,
    y,
    { align: "right" },
  );
  y += 6;
  rule(0.5, BRAND.primary);
  y += 7;

  setFont("bold", 10, BRAND.primary);
  doc.text("PASSENGERS", ML, y);
  y += 5;
  borderedRect(ML, y, CW, 10, BRAND.rule, BRAND.light);
  setFont("bold", 10, BRAND.primary);
  doc.text(passengers.join("  •  ") || voucher.customerName || "-", ML + 4, y + 6.5);
  y += 14;

  setFont("normal", 9, BRAND.text);
  if (voucher.contact) {
    doc.text(`Contact: ${voucher.contact}`, ML, y);
    y += 5;
  }
  if (voucher.customerEmail) {
    doc.text(`Email: ${voucher.customerEmail}`, ML, y);
    y += 5;
  }
  rule(0.3);
  y += 6;

  setFont("bold", 10, BRAND.primary);
  doc.text("BOOKING SUMMARY", ML, y);
  y += 5;

  const summaryRows = [
    ["Adwait Ref", voucher.voucherNumber || "-"],
    ["Booking Ref / PNR", voucher.bookingReference || "-"],
    ["Seat Class", voucher.seatClass || "-"],
    ["Baggage", voucher.baggageAllowance || "-"],
    ["Segments", String(segments.length || 0)],
    ["Status", voucher.status || "Generated"],
  ];

  summaryRows.forEach(([label, value], index) => {
    const colX = index % 2 === 0 ? ML : ML + CW / 2 + 2;
    const rowY = y + Math.floor(index / 2) * 10;
    if (index % 2 === 0 && Math.floor(index / 2) % 2 === 0) {
      filledRect(ML, rowY - 3, CW, 9, "#F5F9FF");
    }
    setFont("bold", 8, BRAND.muted);
    doc.text(label.toUpperCase(), colX, rowY);
    setFont("normal", 9.5, BRAND.text);
    doc.text(String(value || "-"), colX, rowY + 5);
  });

  y += Math.ceil(summaryRows.length / 2) * 10 + 4;
  rule(0.3);
  y += 6;

  setFont("bold", 10, BRAND.primary);
  doc.text("FLIGHT SEGMENTS", ML, y);
  y += 5;

  segments.forEach((segment, index) => {
    ensureSpace(38);
    borderedRect(ML, y, CW, 34, BRAND.rule, index % 2 === 0 ? "#FFFFFF" : "#F9FBFF");
    setFont("bold", 9, BRAND.primary);
    doc.text(
      `Segment ${index + 1}: ${segment.origin || "-"} -> ${segment.destination || "-"}`,
      ML + 4,
      y + 6,
    );
    setFont("normal", 8.5, BRAND.text);
    doc.text(`Airline: ${segment.airline || "-"}`, ML + 4, y + 12);
    doc.text(`Flight No: ${segment.flightNumber || "-"}`, ML + 65, y + 12);
    doc.text(`Seat Class: ${segment.seatClass || voucher.seatClass || "-"}`, ML + 125, y + 12);
    doc.text(`Departure: ${fmtDateTime(segment.departureDateTime)}`, ML + 4, y + 18);
    doc.text(`Arrival: ${fmtDateTime(segment.arrivalDateTime)}`, ML + 105, y + 18);
    doc.text(`Terminal: ${segment.terminal || "-"}`, ML + 4, y + 24);
    doc.text(`Baggage: ${segment.baggageAllowance || voucher.baggageAllowance || "-"}`, ML + 65, y + 24);
    doc.text(`PNR: ${segment.bookingReference || voucher.bookingReference || "-"}`, ML + 125, y + 24);
    if (segment.notes) {
      setFont("italic", 8, BRAND.muted);
      const lines = doc.splitTextToSize(`Notes: ${segment.notes}`, CW - 8);
      doc.text(lines, ML + 4, y + 30);
    }
    y += 39;
  });

  if (voucher.importantNotes?.trim()) {
    ensureSpace(26);
    setFont("bold", 10, BRAND.primary);
    doc.text("IMPORTANT NOTES", ML, y);
    y += 4;
    const lines = doc.splitTextToSize(voucher.importantNotes, CW - 8);
    const boxHeight = lines.length * 5 + 7;
    borderedRect(ML, y, CW, boxHeight, BRAND.rule, "#FFFDE7");
    setFont("normal", 9, BRAND.text);
    doc.text(lines, ML + 4, y + 5);
    y += boxHeight + 6;
  }

  const footerY = Math.max(y + 4, PH - 35);
  rule(0.6, BRAND.primary, footerY);
  setFont("normal", 8, BRAND.muted);
  const footerText =
    "Carry this voucher and a valid photo ID. Please report at the airline counter at least 3 hours before departure unless told otherwise.";
  doc.text(doc.splitTextToSize(footerText, CW), ML + CW / 2, footerY + 5, {
    align: "center",
  });
  setFont("bold", 9, BRAND.primary);
  doc.text("Authorised by: Adwait Tours", ML + CW, footerY + 14, {
    align: "right",
  });
  setFont("normal", 7, BRAND.muted);
  doc.text(`© ${new Date().getFullYear()} Adwait Tours`, ML, footerY + 14);

  const firstSegment = segments[0] || {};
  doc.save(
    `Voucher_${voucher.voucherNumber || "ADW-FLT"}_${sanitise(
      `${firstSegment.origin || "Origin"}_${firstSegment.destination || "Destination"}`,
    )}.pdf`,
  );
}

export function shareFlightVoucherWhatsApp(voucher = {}, agentPhone = BRAND.phone) {
  const segments = Array.isArray(voucher.segments) ? voucher.segments : [];
  const message = [
    `Dear ${voucher.customerName || "Customer"},`,
    "",
    "Your flight voucher is ready.",
    `Voucher Ref: ${voucher.voucherNumber || "-"}`,
    `Booking Ref / PNR: ${voucher.bookingReference || "-"}`,
    "",
    ...segments.slice(0, 3).map(
      (segment, index) =>
        `${index + 1}. ${segment.origin || "-"} -> ${segment.destination || "-"} | ${fmtDateTime(segment.departureDateTime)} | ${segment.airline || "-"} ${segment.flightNumber || ""}`.trim(),
    ),
    "",
    voucher.importantNotes || "Please reach the airport at least 3 hours before departure.",
    "",
    `For assistance: ${agentPhone}`,
    "Adwait Tours",
  ].join("\n");

  const rawContact = String(voucher.contact || "").replace(/\D/g, "");
  const waNumber = rawContact.length === 10 ? `91${rawContact}` : rawContact;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
}

export function shareFlightVoucherEmail(voucher = {}) {
  const segments = Array.isArray(voucher.segments) ? voucher.segments : [];
  const subject = encodeURIComponent(
    `Flight Voucher ${voucher.voucherNumber || "Adwait Tours"}`,
  );
  const body = encodeURIComponent(
    [
      `Dear ${voucher.customerName || "Customer"},`,
      "",
      "Please find your flight voucher details below:",
      `Voucher Ref: ${voucher.voucherNumber || "-"}`,
      `Booking Ref / PNR: ${voucher.bookingReference || "-"}`,
      "",
      ...segments.map(
        (segment, index) =>
          `Segment ${index + 1}: ${segment.origin || "-"} -> ${segment.destination || "-"}, ${segment.airline || "-"} ${segment.flightNumber || ""}, Departure ${fmtDateTime(segment.departureDateTime)}, Arrival ${fmtDateTime(segment.arrivalDateTime)}`,
      ),
      "",
      voucher.importantNotes || "",
      "",
      "Regards,",
      "Adwait Tours",
    ].join("\n"),
  );
  window.open(
    `mailto:${encodeURIComponent(voucher.customerEmail || "")}?subject=${subject}&body=${body}`,
    "_self",
  );
}
