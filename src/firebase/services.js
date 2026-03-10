// utils.js

import { collection, doc, getDoc, getDocs, query, where, setDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config'; // Adjust path to your firebase config
import toast from 'react-hot-toast';

// --- Data Fetching Functions ---

/**
 * Fetches all location/state data from the /locations collection.
 * @param {Firestore} db - The Firestore instance.
 * @returns {Promise<Array>} An array of location objects.
 */
export async function fetchLocations(db) {
  const q = query(collection(db, "locations"), orderBy("name")); // Order by name for consistency
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetches all hotel data from the /hotels collection.
 * @param {Firestore} db - The Firestore instance.
 * @returns {Promise<Array>} An array of hotel objects.
 */
export async function fetchHotels(db) {
  const q = query(collection(db, "hotels"), orderBy("name")); // Order by name for consistency
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetches all activity data from the /activities collection.
 * @param {Firestore} db - The Firestore instance.
 * @returns {Promise<Array>} An array of activity objects.
 */
export async function fetchActivities(db) {
  const q = query(collection(db, "activities"), orderBy("name")); // Order by name for consistency
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetches all transport package data from the /transport collection.
 * @param {Firestore} db - The Firestore instance.
 * @returns {Promise<Array>} An array of transport package objects.
 */
export async function fetchTransportPackages(db) {
  const q = query(collection(db, "transport"), orderBy("name")); // Order by name for consistency
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetches a specific quotation package by customerId for an agent.
 * @param {string} agentId - The UID of the logged-in agent.
 * @param {string} customerId - The ID of the customer/package document.
 * @returns {Promise<Object|null>} The quotation document data or null if not found.
 */
export async function fetchQuotationData(agentId, customerId) {
  const docRef = doc(db, `saved_packages_by_agents/${agentId}/packages`, customerId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("No such document!");
    return null;
  }
}

/**
 * Updates a specific quotation package document.
 * @param {string} agentId - The UID of the logged-in agent.
 * @param {string} customerId - The ID of the customer/package document.
 * @param {Object} dataToUpdate - The data object to merge/update in the document.
 */
export async function updateQuotationData(agentId, customerId, dataToUpdate) {
  const docRef = doc(db, `saved_packages_by_agents/${agentId}/packages`, customerId);
  await setDoc(docRef, dataToUpdate, { merge: true }); // Use merge to update specific fields
}


// --- State Processing / Initialization ---

/**
 * Processes raw data fetched from Firestore into the state structure expected by the component.
 * This ensures default values and correct data types.
 * @param {Object} rawData - The raw object fetched from Firestore.
 * @returns {Object} The processed state object.
 */
export function processFetchedDataForState(rawData) {
  // Destructure with defaults to handle missing fields gracefully
  const {
    leadName = "", // Map 'leadName' from Firestore to 'customerName' for state
    status = "Draft",
    hotelSummary = [],
    transportSummary = null,
    activitySummary = [],
    markup = 0,
    grandTotal = 0,
    packageName = "", // Add other fields if needed by the UI
    createdAt = null,
    // ... other fields from rawData if used by the component
  } = rawData || {};

  return {
    customerName: leadName, // Map the key
    status,
    hotelSummary: hotelSummary.map(h => ({
      id: h.id || Date.now().toString(),
      hotel: h.hotel || "",
      city: h.city || "",
      state: h.state || "",
      nights: h.nights || 1,
      numDouble: h.numDouble || 0,
      numExtraAdult: h.numExtraAdult || 0,
      numExtraChild: h.numExtraChild || 0,
      selectedRoomCategory: h.selectedRoomCategory || "",
      selectedMealPlan: h.selectedMealPlan || "EP",
      hotelTotal: h.hotelTotal || 0,
      // Add other hotel fields if present in rawData.hotelSummary
      // e.g., checkInDate: h.checkInDate || null,
      // e.g., checkOutDate: h.checkOutDate || null,
    })),
    transportSummary: transportSummary ? { ...transportSummary } : null,
    activitySummary: activitySummary.map(a => ({
      name: a.name || "",
      city: a.city || "",
      participants: a.participants || 1,
      fitRatePerPerson: a.fitRatePerPerson || 0,
      groupRatePerPerson: a.groupRatePerPerson || 0,
      ratePerPerson: a.ratePerPerson || 0,
      totalPrice: a.totalPrice || 0,
      // Add other activity fields if present in rawData.activitySummary
    })),
    markup: parseFloat(markup) || 0,
    grandTotal: parseFloat(grandTotal) || 0,
    packageName, // Include other mapped fields
    createdAt,   // Include other mapped fields
    // Add other fields here as needed by the component state structure
  };
}
/**
 * Determines the initial state of the transport toggle (Custom vs Package) based on the fetched transportSummary.
 * @param {Object|null} transportSummary - The transportSummary object from the fetched data.
 * @returns {boolean} True if the mode should be Package, False if Custom.
 */
export function initializeTransportToggle(transportSummary) {
  // If transportSummary is null, default to Custom (false)
  if (!transportSummary) {
    return false;
  }

  // If packageName is "Custom", it's custom mode (false)
  if (transportSummary.packageName === "Custom") {
    return false;
  }

  // If an 'id' is present, it likely refers to a package (true)
  if (transportSummary.id) {
    return true;
  }

  // Default fallback, if no clear indicator, assume Custom
  return false;
}


// --- Calculation Functions ---

/**
 * Calculates the grand total based on hotel, transport, activity summaries, and markup.
 * @param {Array} hotelSummary - Array of hotel objects with hotelTotal.
 * @param {Object|null} transportSummary - Transport object potentially with price/totalPrice.
 * @param {Array} activitySummary - Array of activity objects with totalPrice.
 * @param {number} markup - The markup amount.
 * @returns {number} The calculated grand total.
 */
export function calculateGrandTotal(hotelSummary, transportSummary, activitySummary, markup) {
  const hotelTotal = hotelSummary.reduce((sum, h) => sum + (h.hotelTotal || 0), 0);
  const transportTotal = calculateTransportTotal(transportSummary);
  const activityTotal = activitySummary.reduce((sum, a) => sum + (a.totalPrice || 0), 0);

  return hotelTotal + transportTotal + activityTotal + markup;
}

/**
 * Helper to calculate the total cost for transport based on its structure (Custom or Package).
 * @param {Object|null} transportSummary - The transport object.
 * @returns {number} The calculated transport total.
 */
function calculateTransportTotal(transportSummary) {
  if (!transportSummary) {
    return 0;
  }

  // Check for pricing type if perKm is supported
  if (transportSummary.pricingType === "perKm") {
    return (transportSummary.perKmprice || 0) * (transportSummary.kms || 0);
  }

  // Default to 'price' or 'totalPrice' field for fixed pricing
  return transportSummary.price || transportSummary.totalPrice || 0;
}


// --- Utility Functions ---

/**
 * Returns available meal plans based on the selected room category.
 * @param {Object} hotelEntry - The hotel object from the summary.
 * @returns {Array<string>} An array of meal plan strings.
 */
export function getAvailableMealPlans(hotelEntry) {
  // This logic depends on your hotel data structure in Firestore.
  // Example: If the selected room category is known, check its allowed meal plans.
  // For simplicity, returning a common set. Adjust based on real data.
  const category = hotelEntry.selectedRoomCategory;
  // Example logic (replace with actual lookup if needed):
  // if (category === "Deluxe") return ["EP", "CP", "MAP", "AP"];
  // if (category === "Standard") return ["EP", "CP"];
  // return ["EP"]; // Default

  // Default common meal plans
  return ["EP", "CP", "MAP", "AP"];
}

/**
 * Converts a string to Title Case.
 * @param {string} str - The string to convert.
 * @returns {string} The converted string.
 */
export function toTitleCase(str) {
  if (!str) return "";
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// Other helper functions like handleEditChange, handleAddHotel, etc. are
// typically implemented as event handlers within the component itself
// because they interact directly with React state (useState hooks).
// This utils file focuses on pure logic and data interactions.
// The page.jsx component provided earlier integrates these utility functions
// into its local state management and event handlers.



export const createTripForm = async (agentId, tripData) => {
  try {
    // Validate that we have at least one journey
    if (tripData.journeys.length === 0) throw new Error("Add at least one journey");

    const docRef = await addDoc(collection(db, "trips"), {
      ...tripData,
      agentId, // Ownership link
      createdAt: serverTimestamp(),
      status: "active",
    });

    toast.success("Form created successfully!");
    return docRef.id;
  } catch (error) {
    toast.error(error.message || "Failed to create trip");
    return null;
  }
};