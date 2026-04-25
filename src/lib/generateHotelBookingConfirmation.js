const MEAL_PLAN_LABELS = {
  EP: "Room only",
  CP: "Breakfast included",
  MAP: "Breakfast and Dinner included",
  AP: "All meals included",
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toMealPlanLabel = (value) => {
  const key = String(value || "EP").toUpperCase();
  return MEAL_PLAN_LABELS[key] || key;
};

const getSpecialRequests = (quotation = {}, hotel = {}) => {
  return (
    hotel.specialRequests ||
    hotel.specialRequest ||
    hotel.requests ||
    quotation.specialRequests ||
    quotation.specialRequest ||
    quotation.requests ||
    "None"
  );
};

const getHotelGuestCount = (quotation = {}, hotel = {}) => {
  const explicitHotelGuestCount = Number(
    hotel.totalGuests ?? hotel.totalPax ?? hotel.guests,
  );
  if (explicitHotelGuestCount > 0) return explicitHotelGuestCount;

  const bookingGuestCount =
    Number(quotation.adults || 0) + Number(quotation.children || 0);
  if (bookingGuestCount > 0) return bookingGuestCount;

  return (
    Number(hotel.numDouble || 0) * 2 +
    Number(hotel.numExtraAdult || 0) +
    Number(hotel.numExtraChild || 0) +
    Number(hotel.numCNB || 0)
  );
};

export const normaliseHotelForBookingConfirmation = (
  hotel = {},
  quotation = {},
) => ({
  hotelName: hotel.hotel || hotel.hotelName || "Hotel",
  city: hotel.city || "",
  checkInDate: hotel.checkInDate || hotel.checkIn || "",
  checkOutDate: hotel.checkOutDate || hotel.checkOut || "",
  nights: hotel.nights || 0,
  roomType: hotel.selectedRoomCategory || hotel.roomCategory || "N/A",
  numberOfRooms: hotel.numDouble || hotel.rooms || 0,
  mealPlan: toMealPlanLabel(hotel.selectedMealPlan || hotel.mealPlan || "EP"),
  totalGuests: getHotelGuestCount(quotation, hotel),
});

export function generateHotelBookingConfirmationMessage(quotation = {}, rawHotel = {}) {
  const hotel = normaliseHotelForBookingConfirmation(rawHotel, quotation);
  const guestName =
    quotation.customerName || quotation.leadName || quotation.guestName || "Guest";

  return [
    "Dear Team,",
    "",
    "Greetings from Adwait Tours.",
    "",
    "We would like to request a booking for the following details:",
    "",
    `Hotel Name: ${hotel.hotelName}${hotel.city ? `, ${hotel.city}` : ""}`,
    `Check-in Date: ${formatDate(hotel.checkInDate)}`,
    `Check-out Date: ${formatDate(hotel.checkOutDate)}`,
    `Number of Nights: ${hotel.nights || 0}`,
    "",
    "Room Details:",
    `- Room Type: ${hotel.roomType}`,
    `- Number of Rooms: ${hotel.numberOfRooms || 0}`,
    `- Meal Plan: ${hotel.mealPlan}`,
    "",
    "Guest Details:",
    `- Guest Name: ${guestName}`,
    `- Total Guests: ${hotel.totalGuests || 0}`,
    "",
    "Special Requests:",
    `${getSpecialRequests(quotation, rawHotel)}`,
    "",
    "Kindly confirm availability and share the confirmation at the earliest.",
    "",
    "Looking forward to best guests experience.",
    "",
    "Best Regards,",
    "Adwait Tours",
    "📞 +91 9884798483",
    "📧 sales@adwaittours.com",
    "🌐 www.adwaittours.com",
  ].join("\n");
}
