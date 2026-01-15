
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

export const getTransportData = async () => {
  try {
    const transportCollection = collection(db, "transport");
    const snapshot = await getDocs(transportCollection);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      stateName: doc.data().stateName,
    }));
  } catch (error) {
    console.error("Error fetching transport:", error);
    return [];
  }
};

export const getPackagesByState = async (stateId) => {
  try {
    const packagesCol = collection(db, "transport", stateId, "packages");
    const snapshot = await getDocs(packagesCol);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching transport packages:", error);
    return [];
  }
};