// src/lib/quotationUtils.js

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
  if (!fullHotelData || !Array.isArray(fullHotelData.rooms)) {
    return ["EP", "CP", "MAP", "AP"];
  }

  const room = fullHotelData.rooms.find(
    (r) => r.categoryName === hotelEntry.selectedRoomCategory
  );

  if (!room || !Array.isArray(room.seasons)) {
    return ["EP", "CP", "MAP", "AP"];
  }

  let checkIn;
  if (hotelEntry.checkInDate?.seconds) {
    checkIn = new Date(hotelEntry.checkInDate.seconds * 1000);
  } else {
    checkIn = new Date(hotelEntry.checkInDate);
  }

  if (isNaN(checkIn.getTime())) return ["EP", "CP", "MAP", "AP"];

  checkIn.setHours(0, 0, 0, 0);

  const season = room.seasons.find((s) => {
    const start = new Date(s.start);
    const end = new Date(s.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return checkIn >= start && checkIn <= end;
  });

  if (!season || !season.pricing) return ["EP", "CP", "MAP", "AP"];

  const plans = [];
  ["EP", "CP", "MAP", "AP"].forEach((plan) => {
    const key = plan.toLowerCase();
    const p = season.pricing[key];
    if (p && (p.double > 0 || p.extraAdult > 0 || p.extraChild > 0)) {
      plans.push(plan);
    }
  });

  return plans.length > 0 ? plans : ["EP"];
};

// Calculate price for one hotel entry
export const calculateHotelPrice = (entry, fullHotelData) => {
  if (!entry || !fullHotelData) return 0;

  const {
    checkInDate,
    selectedRoomCategory,
    selectedMealPlan,
    numDouble = 0,
    numExtraAdult = 0,
    numExtraChild = 0,
    nights = 1,
  } = entry;

  const room = fullHotelData.rooms?.find((r) => r.categoryName === selectedRoomCategory);
  if (!room || !room.seasons) return 0;

  let checkIn;
  if (checkInDate?.seconds) {
    checkIn = new Date(checkInDate.seconds * 1000);
  } else {
    checkIn = new Date(checkInDate);
  }

  if (isNaN(checkIn.getTime())) return 0;
  checkIn.setHours(0, 0, 0, 0);

  const season = room.seasons.find((s) => {
    const start = new Date(s.start);
    const end = new Date(s.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return checkIn >= start && checkIn <= end;
  });

  if (!season || !season.pricing || !selectedMealPlan) return 0;

  const pricing = season.pricing[selectedMealPlan.toLowerCase()];
  if (!pricing) return 0;

  const double = (pricing.double || 0) * numDouble;
  const extraAdult = (pricing.extraAdult || 0) * numExtraAdult;
  const extraChild = (pricing.extraChild || 0) * numExtraChild;

  return (double + extraAdult + extraChild) * nights;
};

// Calculate grand total of entire quotation
export const recalculateGrandTotal = (data) => {
  let hotelTotal = (data.hotelSummary || []).reduce(
    (sum, h) => sum + (h.hotelTotal || 0),
    0
  );

  let transportTotal = 0;
  if (data.transportSummary) {
    if (data.transportSummary.pricingType === "perKm") {
      transportTotal =
        (data.transportSummary.kms || 0) * (data.transportSummary.perKmprice || 0);
    } else {
      transportTotal = data.transportSummary.price || 0;
    }
  }

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