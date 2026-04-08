export const enquiryInitialValues = {
  name: "",
  email: "",
  mobile: "",
  travelDate: "",
  days: "",
  destination: "",
  adults: "",
  children: "",
  hotelPreference: "",
  transportPreference: "",
  budget: "",
  notes: "",
  mealPlan: "",
  hotelCategory: "",
  departureCity: "",
  tripType: "",
  rooms: "",
  sightseeingVehicle: "",
  ticketHelp: [],
};

export const enquiryRequiredFields = [
  "name",
  "email",
  "mobile",
  "travelDate",
  "days",
  "destination",
  "adults",
  "departureCity",
  "tripType",
];

export const normalizeEmail = (email = "") => email.trim().toLowerCase();
export const normalizeMobile = (mobile = "") => mobile.replace(/\D/g, "");

export function validateEnquiry(values) {
  const errors = {};

  enquiryRequiredFields.forEach((field) => {
    const value = values[field];
    const isEmpty = Array.isArray(value)
      ? value.length === 0
      : String(value ?? "").trim() === "";

    if (isEmpty) {
      errors[field] = "This field is required";
    }
  });

  const email = normalizeEmail(values.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  }

  const mobile = normalizeMobile(values.mobile);
  if (mobile && !/^\d{10}$/.test(mobile)) {
    errors.mobile = "Enter a valid 10-digit mobile number";
  }

  return errors;
}
