import { db } from "./config"; // Adjust path to your firebase config
import { collection, getDocs } from "firebase/firestore";

// --- Locations & States ---
export const fetchLocations = async () => {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// --- Hotels ---
export const fetchAllHotels = async () => {
  const snapshot = await getDocs(collection(db, "hotels"));
  const hotelList = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    rooms: doc.data().rooms || [],
  }));
  
  // Deduping logic from your original code
  const uniqueHotelsMap = new Map();
  return hotelList.filter((hotel) => {
    const key = `${hotel.name.toLowerCase()}-${hotel.state.toLowerCase()}-${hotel.city.toLowerCase()}`;
    if (!uniqueHotelsMap.has(key)) {
      uniqueHotelsMap.set(key, true);
      return true;
    }
    return false;
  });
};

// --- Transport ---
export const fetchTransportPackages = async (stateId) => {
  if (!stateId) return [];
  const cleanId = stateId.toLowerCase().replace(/ /g, "-");
  const snapshot = await getDocs(collection(db, "transport", cleanId, "packages"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const fetchTransportStates = async () => {
    const snapshot = await getDocs(collection(db, "transport"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// --- Activities ---
export const fetchActivities = async () => {
  const snapshot = await getDocs(collection(db, "activities"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};