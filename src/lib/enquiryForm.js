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
  childAges: [],
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
  "mealPlan",
  "rooms",
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

  const childCount = Number(values.children || 0);
  const childAges = Array.isArray(values.childAges) ? values.childAges : [];
  if (childCount > 0) {
    if (childAges.length !== childCount) {
      errors.childAges = "Enter age for each child";
    } else if (
      childAges.some((age) => {
        const numericAge = Number(age);
        return String(age).trim() === "" || Number.isNaN(numericAge) || numericAge < 0;
      })
    ) {
      errors.childAges = "Child ages are required";
    }
  }

  return errors;
}
