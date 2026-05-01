// src/lib/quotationUtils.js
import {
  calculateHotelStayPrice,
  getAvailableHotelMealPlans,
} from "@/lib/hotelRateAvailability";

// Format Firebase timestamp or ISO string to readable date (used in PDF & display)
export const formatPdfDate = (dateData) => {
  if (!dateData) return "N/A";

  let date;
  if (dateData.seconds) {
    date = new Date(dateData.seconds * 1000);
  } else {
    date = new Date(dateData);
  }

  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Generate destination summary string from quotation (used in table & filters)
export const getDestinationOfpkg = (quote) => {
  if (!quote) return "N/A";

  let result = "";

  // Priority: Hotels
  if (Array.isArray(quote.hotelSummary) && quote.hotelSummary.length > 0) {
    const stateCityMap = new Map();
    quote.hotelSummary.forEach((hotel) => {
      const state = hotel.state;
      const city = hotel.city;
      if (state && city) {
        if (!stateCityMap.has(state)) stateCityMap.set(state, new Set());
        stateCityMap.get(state).add(city);
      }
    });

    stateCityMap.forEach((cities, state) => {
      result += `${state} (${Array.from(cities).sort().join(", ")}) \n`;
    });
    return result.trim() || "N/A";
  }

  // Fallback: Transport
  if (quote.transportSummary?.state) {
    return `${quote.transportSummary.state} (Transport)`;
  }

  // Fallback: Activities
  if (Array.isArray(quote.activitySummary) && quote.activitySummary.length > 0) {
    const stateCityMap = new Map();
    quote.activitySummary.forEach((act) => {
      const state = act.state;
      const city = act.city;
      if (state && city) {
        if (!stateCityMap.has(state)) stateCityMap.set(state, new Set());
        stateCityMap.get(state).add(city);
      }
    });

    stateCityMap.forEach((cities, state) => {
      result += `${state} (${Array.from(cities).sort().join(", ")}) \n`;
    });
    return result.trim() || "N/A";
  }

  return "N/A";
};

// Get available meal plans for a hotel entry based on season & pricing
export const getAvailableMealPlans = (hotelEntry, fullHotelData) => {
  return getAvailableHotelMealPlans(hotelEntry, fullHotelData);
};

// Calculate price for one hotel entry
export const calculateHotelPrice = (entry, fullHotelData) => {
  return calculateHotelStayPrice(entry, fullHotelData);
};

// Calculate grand total of entire quotation
export const recalculateGrandTotal = (data) => {
  let hotelTotal = (data.hotelSummary || []).reduce(
    (sum, h) => sum + (h.hotelTotal || 0),
    0
  );

  
  const transportTotal =
    data.transportSummary?.totalTransportCost || 0;

  const activityTotal = (data.activitySummary || []).reduce(
    (sum, a) => sum + (a.totalPrice || 0),
    0
  );

  const markup = data.markup || 0;

  return hotelTotal + transportTotal + activityTotal + markup;
};

// Placeholder for generating WhatsApp/email friendly text summary
// (you can expand this later with full logic from original component)
export const generatePackageSummaryText = (quotation) => {
  if (!quotation) return "";

  let text = `Dear Guest,\n\nGreetings from Adwait Tours!\n\n`;

  // Add more logic here when you want full copy-to-clipboard feature
  text += `Package: ${quotation.packageName || "Custom Package"}\n`;
  text += `Customer: ${quotation.customerName || "N/A"}\n`;
  text += `Grand Total: ₹${quotation.grandTotal?.toLocaleString("en-IN") || 0}/-\n\n`;

  text += "Thank you!";

  return text;
};

export const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .replace(/-/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
