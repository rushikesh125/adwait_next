// @/lib/my-quotation-pdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates and downloads a quotation PDF
 * @param {Object} quotation - The full quotation object
 * @param {Array} allHotels - Array of all hotel documents from Firestore
 * @returns {void} Triggers browser download
 */
export function generateAndDownloadQuotationPDF(quotation, allHotels) {
  if (!quotation || !quotation.hotelSummary || quotation.hotelSummary.length === 0) {
    alert("Cannot generate PDF: Quotation data is incomplete or has no hotels.");
    return;
  }

  const doc = new jsPDF();

  const BRAND_COLOR_BLUE = "#0D47A1";
  const HEADER_TEXT_COLOR = "#444444";
  const FONT_SIZE_NORMAL = 9;
  const FONT_SIZE_SMALL = 8;
  const pageContentWidth = 180;

  const img = new Image();
  img.src = "/adwait-logo.jpg";

  img.onload = () => {
    // ────────────────────────────────────────────────
    // Helper: Header (logo + contact + line)
    // ────────────────────────────────────────────────
    const addHeader = () => {
      const logoY = 10;
      const companyNameY = logoY + 8;
      const sloganY = companyNameY + 7;

      const logoWidth = 40;
      const logoHeight = (img.height * logoWidth) / img.width;
      doc.addImage(img, "PNG", 15, logoY, logoWidth, logoHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(BRAND_COLOR_BLUE);
      doc.text("Adwait Tours", 60, companyNameY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(HEADER_TEXT_COLOR);
      doc.text("Travel Package Quotation", 60, sloganY);

      // Contact block (right side)
      const contactBlockX = 160;
      let contactLineY = logoY + 4;

      const addClickableText = (label, text, url, y) => {
        const fullText = `${label}${text}`;
        const textWidth =
          (doc.getStringUnitWidth(fullText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;
        const textHeight = (FONT_SIZE_SMALL / doc.internal.scaleFactor) * 1.15;

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "bold");
        doc.text(label, contactBlockX, y, { align: "left" });

        doc.setTextColor(0, 0, 255);
        doc.setFont(undefined, "normal");
        doc.text(
          text,
          contactBlockX +
            (doc.getStringUnitWidth(label) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          y,
          { align: "left" }
        );

        doc.link(contactBlockX, y - textHeight + 1, textWidth, textHeight, { url });
      };

      addClickableText("Phone: ", "+91 9884798483", "tel:+919884798483", contactLineY);
      contactLineY += 5;
      addClickableText("Email: ", "sales@adwaittours.com", "mailto:sales@adwaittours.com", contactLineY);
      contactLineY += 5;
      addClickableText("Web: ", "www.adwaittours.com", "https://www.adwaittours.com", contactLineY);

      const finalHeaderBottomY = Math.max(logoY + logoHeight, sloganY, contactLineY) + 5;
      doc.setDrawColor("#CCCCCC");
      doc.setLineWidth(0.2);
      doc.line(15, finalHeaderBottomY, 200, finalHeaderBottomY);
    };

    // ────────────────────────────────────────────────
    // Helper: Footer
    // ────────────────────────────────────────────────
    const addFooter = () => {
      doc.setDrawColor("#CCCCCC");
      doc.setLineWidth(0.2);
      doc.line(15, 282, 200, 282);

      doc.setFontSize(FONT_SIZE_SMALL);
      doc.setTextColor(HEADER_TEXT_COLOR);
      doc.text("Thank you for choosing Adwait Tours!", 107, 287, { align: "center" });

      const linkY = 291;
      const googleText = "For Reviews: Google Page";
      const instaText = "Follow Us: Instagram";
      const separator = " | ";

      const fullText = googleText + separator + instaText;
      const fullWidth = (doc.getStringUnitWidth(fullText) * FONT_SIZE_SMALL) / doc.internal.scaleFactor;
      const startX = 107 - fullWidth / 2;

      const googleWidth = (doc.getStringUnitWidth(googleText) * FONT_SIZE_SMALL) / doc.internal.scaleFactor;

      doc.setTextColor(0, 0, 255);
      doc.text(googleText, startX, linkY);
      doc.setDrawColor(0, 0, 255);
      doc.setLineWidth(0.2);
      doc.line(startX, linkY + 1, startX + googleWidth, linkY + 1);
      doc.link(startX, linkY - FONT_SIZE_SMALL, googleWidth, FONT_SIZE_SMALL, {
        url: "https://share.google/gpnOuOQxhD49T77Yw",
      });

      const sepX = startX + googleWidth;
      doc.setTextColor(HEADER_TEXT_COLOR);
      doc.text(separator, sepX, linkY);

      const instaWidth = (doc.getStringUnitWidth(instaText) * FONT_SIZE_SMALL) / doc.internal.scaleFactor;
      const instaX = sepX + (doc.getStringUnitWidth(separator) * FONT_SIZE_SMALL) / doc.internal.scaleFactor;

      doc.setTextColor(0, 0, 255);
      doc.text(instaText, instaX, linkY);
      doc.setDrawColor(0, 0, 255);
      doc.line(instaX, linkY + 1, instaX + instaWidth, linkY + 1);
      doc.link(instaX, linkY - FONT_SIZE_SMALL, instaWidth, FONT_SIZE_SMALL, {
        url: "https://www.instagram.com/adwaittours?igsh=MW11cGRldWR4aGJxdQ==",
      });
    };

    // ────────────────────────────────────────────────
    // Start building content
    // ────────────────────────────────────────────────
    addHeader();
    let currentY = 32;
    currentY += 20;

    const formatPdfDate = (dateData) => {
      if (!dateData) return "N/A";
      const date = dateData.seconds ? new Date(dateData.seconds * 1000) : new Date(dateData);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const getDestinationOfpkg = (quote) => {
      // ← copy your existing getDestinationOfpkg logic here (or import it)
      // For brevity — assuming it's already available or paste it
      if (!quote?.hotelSummary?.length) {
        if (quote?.transportSummary?.state) return `${quote.transportSummary.state} (Transport)`;
        return "N/A";
      }
      const map = new Map();
      quote.hotelSummary.forEach(h => {
        if (h.state && h.city) {
          if (!map.has(h.state)) map.set(h.state, new Set());
          map.get(h.state).add(h.city);
        }
      });
      return Array.from(map)
        .map(([state, cities]) => `${state} (${Array.from(cities).sort().join(", ")})`)
        .join("\n");
    };

    const firstHotel = quotation.hotelSummary[0];
    const travelStart = formatPdfDate(firstHotel.checkInDate);
    const travelEnd = formatPdfDate(quotation.hotelSummary.at(-1).checkOutDate);

    autoTable(doc, {
      startY: currentY,
      body: [
        ["Customer Name:", quotation.customerName || "N/A", "Quotation Date:", formatPdfDate(new Date())],
        [
          "Travel Dates:",
          `${travelStart} - ${travelEnd}`,
          "No. of Guests:",
          `${firstHotel.numDouble || 0} Couple(s), ${firstHotel.numExtraAdult || 0} Adult(s), ${firstHotel.numExtraChild || 0} Child(ren) with mattress${
            Number(firstHotel.numCNB) > 0 ? `, ${firstHotel.numCNB} Child(ren) no bed` : ""
          }`,
        ],
        ["Destination:", getDestinationOfpkg(quotation)],
      ],
      theme: "plain",
      styles: { fontSize: FONT_SIZE_NORMAL },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 2: { fontStyle: "bold", cellWidth: 35 } },
      margin: { left: 15, right: 15 },
    });
    currentY = doc.lastAutoTable.finalY;

    // Hotel Details Table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Hotel Details", 15, currentY + 10);
    currentY += 12;

    const MealPlans = {
      EP: "Accommodation only",
      CP: "Breakfast only",
      MAP: "Breakfast and Dinner",
      AP: "Breakfast, Lunch and Dinner",
    };

    autoTable(doc, {
      startY: currentY + 5,
      head: [["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan"]],
      body: quotation.hotelSummary.map(h => {
        const hotelData = allHotels.find(
          ht => ht.name === h.hotel && ht.city === h.city && ht.state === h.state
        );
        return [
          { content: h.hotel, _fullData: hotelData },
          h.city,
          h.selectedRoomCategory,
          `${formatPdfDate(h.checkInDate)} - ${formatPdfDate(h.checkOutDate)}`,
          h.nights,
          MealPlans[h.selectedMealPlan] || h.selectedMealPlan || "—",
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: BRAND_COLOR_BLUE },
      styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
      columnStyles: { 4: { halign: "center" } },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(),
      didParseCell: data => {
        if (data.section === "body" && data.column.index === 0) {
          if (data.cell.raw?._fullData?.GoogleListingURL) {
            data.cell.styles.textColor = [0, 0, 255];
          }
        }
      },
      didDrawCell: data => {
        if (data.section === "body" && data.column.index === 0) {
          const hotel = data.cell.raw?._fullData;
          if (hotel?.GoogleListingURL) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
              url: hotel.GoogleListingURL,
            });
          }
        }
      },
    });
    currentY = doc.lastAutoTable.finalY;

    // Grand Total
    const hotelTotal = quotation.hotelSummary.reduce((sum, h) => sum + (h.hotelTotal || 0), 0);
    let transportTotal = 0;
    if (quotation.transportSummary) {
      transportTotal =
        quotation.transportSummary.pricingType === "perKm"
          ? (quotation.transportSummary.perKmprice || 0) * (quotation.transportSummary.kms || 0)
          : quotation.transportSummary.price || 0;
    }
    const activityTotal = quotation.activitySummary?.reduce((s, a) => s + (a.totalPrice || 0), 0) || 0;
    const grandTotal = hotelTotal + transportTotal + activityTotal + (quotation.markup || 0);

    autoTable(doc, {
      startY: currentY + 10,
      body: [
        [
          { content: "Grand Total Tour Cost:", styles: { halign: "left", fontStyle: "bold", textColor: BRAND_COLOR_BLUE } },
          {
            content: `Rs. ${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`,
            styles: { halign: "right", fontStyle: "bold", textColor: BRAND_COLOR_BLUE },
          },
        ],
      ],
      theme: "grid",
      styles: { fontSize: FONT_SIZE_NORMAL + 2, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 120 } },
      margin: { left: 15, right: 15 },
      didDrawPage: () => addHeader(),
    });
    currentY = doc.lastAutoTable.finalY;

    // Inclusions / Exclusions ────────────────────────────────
    // (you can further extract this part too if needed)

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Inclusions & Exclusions", 15, currentY + 10);
    currentY += 12;

    // ... rest of inclusions/exclusions logic (meals counting, transport text, etc.)

    addFooter();
    doc.save(`Quotation-${quotation.customerName?.replace(/ /g, "_") || "Customer"}.pdf`);
  };

  img.onerror = () => {
    alert("Failed to generate PDF: Could not load company logo.");
  };
}