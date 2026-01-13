
import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

// Fetch all hotels in a specific city
export const getHotelsByCity = async (city) => {
  try {
    const q = query(collection(db, "hotels"), where("city", "==", city));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching hotels:", error);
    return [];
  }
};

// Fetch all transport states
export const getTransportStates = async () => {
  const snapshot = await getDocs(collection(db, "transport"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Fetch activities by state
export const getActivitiesByState = async (state) => {
  const snapshot = await getDocs(collection(db, "activities"));
  const all = snapshot.docs.map(doc => doc.data());
  return all.filter(act => act.state === state);
};

export const getTransportPackageById = async (stateId, packageId) => {
  try {
    const docRef = doc(db, "transport", stateId, "packages", packageId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    console.error("Error fetching transport package:", error);
    return null;
  }
};
export const getAllActivities = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "activities"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
};