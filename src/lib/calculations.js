// lib/calculations.js

/**
 * Format date to DD-MMM-YYYY format
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Invalid Date';
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
};

/**
 * Calculate checkout date based on checkin and nights
 * @param {string} checkInDate - Check-in date
 * @param {number} nights - Number of nights
 * @returns {string} Checkout date in YYYY-MM-DD format
 */
export const calculateCheckoutDate = (checkInDate, nights) => {
  if (!checkInDate || !nights) return '';

  const inDate = new Date(checkInDate);
  if (isNaN(inDate)) return '';

  const outDate = new Date(inDate);
  outDate.setDate(inDate.getDate() + parseInt(nights));
  return outDate.toISOString().split('T')[0];
};

/**
 * Calculate total meals across all hotels
 * @param {Array} hotelEntries - Array of hotel entries
 * @returns {Object} Object with totalBreakfasts, totalLunches, totalDinners
 */
export const calculateTotalMeals = (hotelEntries) => {
  let totalBreakfasts = 0;
  let totalLunches = 0;
  let totalDinners = 0;

  if (!Array.isArray(hotelEntries)) return { totalBreakfasts, totalLunches, totalDinners };

  hotelEntries.forEach((entry) => {
    const mealPlan = entry.selectedMealPlan?.toUpperCase() || 'EP';
    const nights = parseInt(entry.nights, 10) || 0;

    if (isNaN(nights) || nights < 0) return;

    switch (mealPlan) {
      case 'CP':
        totalBreakfasts += nights;
        break;
      case 'MAP':
        totalBreakfasts += nights;
        totalDinners += nights;
        break;
      case 'AP':
        totalBreakfasts += nights;
        totalLunches += nights;
        totalDinners += nights;
        break;
      case 'EP':
      default:
        break;
    }
  });

  return { totalBreakfasts, totalLunches, totalDinners };
};

/**
 * Meal plan descriptions
 */
export const MEAL_PLAN_DESCRIPTIONS = {
  EP: 'Accommodation only',
  CP: 'Breakfast Only',
  MAP: 'Breakfast and Dinner',
  AP: 'Breakfast, Lunch and Dinner',
};

/**
 * Calculate grand total for package
 * @param {Object} packageData - Package data
 * @returns {number} Grand total
 */
export const calculateGrandTotal = (packageData) => {
  const hotelTotal =
    packageData.hotelEntries?.reduce(
      (sum, hotel) => sum + (hotel.nights || 0) * (hotel.hotelTotal || 0),
      0
    ) || 0;

  let transportTotal = 0;
  if (packageData.selectedTransport?.selectedVehicle) {
    if (packageData.selectedTransport.pricingType === 'perKm') {
      transportTotal =
        (packageData.selectedTransport.kms || 0) *
        (packageData.selectedTransport.selectedVehicle.perKmprice || 0);
    } else {
      transportTotal = Number(packageData.selectedTransport.selectedVehicle.price || 0);
    }
  }

  const activityTotal =
    packageData.selectedActivities?.reduce(
      (sum, act) => sum + (act.totalPrice || 0),
      0
    ) || 0;

  const markup = packageData.confirmedMarkup || 0;

  return hotelTotal + transportTotal + activityTotal + markup;
};

/**
 * Generate package summary text for clipboard
 * @param {Object} quotationData - Quotation data
 * @param {Array} allHotels - All hotels data for URLs
 * @returns {string} Formatted summary text
 */
export const generatePackageSummary = (quotationData, allHotels) => {
  if (!quotationData || !quotationData.hotelSummary || quotationData.hotelSummary.length === 0) {
    return 'Hotel details not available.';
  }

  const firstEntry = quotationData.hotelSummary[0];
  
  let summary = '';
  summary += `Dear Guests,\n\n`;
  summary += `Greetings from Adwait Tours!!\n`;
  summary += `Kindly find the best possible rates for your requirement starting ${formatDate(firstEntry.checkInDate)}\n`;
  summary += `${firstEntry.numDouble || 0} Couple\n`;
  summary += `${firstEntry.numExtraChild || 0} Extra Child\n`;
  summary += `${firstEntry.numExtraAdult || 0} Extra Adult\n\n`;

  summary += `*HOTELS*\n`;
  quotationData.hotelSummary.forEach((entry, index) => {
    const hotelFullDetails = allHotels.find(
      (h) => h.name === entry.hotel && h.city === entry.city && h.state === entry.state
    );

    const hotelCheckIn = formatDate(entry.checkInDate);
    const hotelCheckOut = formatDate(entry.checkOutDate);
    const mealPlanDesc = MEAL_PLAN_DESCRIPTIONS[entry.selectedMealPlan?.toUpperCase()] || 'MEAL PLAN';

    summary += `${index + 1}. ${entry.hotel.toUpperCase()} ${hotelFullDetails?.GoogleListingURL || ''}\n`;
    summary += ` ⇒ ${entry.city}, ${entry.state}\n`;
    summary += ` ⇒ Hotel Room Count: ${entry.numDouble || 0} Hotel Room Category: ${entry.selectedRoomCategory?.toUpperCase() || 'N/A'}\n`;
    summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${entry.nights} Nights, ${mealPlanDesc})\n\n`;
  });

  const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(quotationData.hotelSummary);

  summary += `*TOTAL TOUR COST = ₹${quotationData.grandTotal.toFixed()}/-*\n\n`;
  summary += `*INCLUDED*\n`;

  if (totalBreakfasts > 0) summary += `✅ ${totalBreakfasts} Breakfast(s)\n`;
  if (totalLunches > 0) summary += `✅ ${totalLunches} Lunch(es)\n`;
  if (totalDinners > 0) summary += `✅ ${totalDinners} Dinner(s)\n`;
  if (totalBreakfasts === 0 && totalLunches === 0 && totalDinners === 0) {
    summary += `✅ No meals included (EP Plan for all hotels or unspecified)\n`;
  }

  if (quotationData.transportSummary?.selectedVehicle) {
    const vehicle = quotationData.transportSummary.selectedVehicle;
    const acStatus = vehicle.ac ? 'AC' : 'Non AC';
    summary += `✅ ${vehicle.name || vehicle.type} ${acStatus} for all sightseeing and transfer as per itinerary\n`;
    summary += `✅ Toll, Parking, Driver Allowance, Permits\n`;
  }

  quotationData.activitySummary?.forEach((activity) => {
    summary += `✅ ${activity.name.toUpperCase()} (${activity.city}) - ${activity.participants} Person\n`;
  });

  summary += `\n*EXCLUDED*\n`;
  summary += `❌ Train / Flight Fare\n`;
  summary += `❌ Early check in and late check out as per hotel policy\n`;
  summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
  summary += `❌ Anything not mentioned in included\n`;

  return summary;
};