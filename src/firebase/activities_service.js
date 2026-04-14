
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

/**
 * Fetches all unique state names from the 'locations' collection
 */
export const fetchAllStates = async () => {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((doc) => doc.data().name);
};

/**
 * Fetches activities filtered by state using a Firestore where clause
 */
export const fetchActivitiesByState = async (selectedState) => {
  const snapshot = await getDocs(
    query(collection(db, "activities"), where("state", "==", selectedState))
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};