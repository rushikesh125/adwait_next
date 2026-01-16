import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";
;

/**
 * Fetches all available states from the transport collection.
 */
export const fetchTransportStates = async () => {
  const transportCollection = collection(db, "transport");
  const snapshot = await getDocs(transportCollection);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    stateName: doc.data().stateName,
  }));
};

/**
 * Fetches all packages for a specific state.
 */
export const fetchPackagesByState = async (stateId) => {
  if (!stateId) return [];
  const packagesCollection = collection(db, "transport", stateId, "packages");
  const snapshot = await getDocs(packagesCollection);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};