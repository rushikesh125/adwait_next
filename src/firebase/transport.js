
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";


export async function fetchAllStates() {
  try {
    const transportCollection = collection(db, "transport");
    const snapshot = await getDocs(transportCollection);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      stateName: doc.data().stateName,
    }));
  } catch (error) {
    console.error("Error fetching transport states:", error);
    return [];
  }
}

export async function fetchPackagesForState(stateId) {
  if (!stateId) return [];

  try {
    const packagesCollection = collection(db, "transport", stateId, "packages");
    const snapshot = await getDocs(packagesCollection);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching packages:", error);
    return [];
  }
}