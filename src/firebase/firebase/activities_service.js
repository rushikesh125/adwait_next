
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

/**
 * Fetches all unique state names from the 'locations' collection
 */
export const fetchAllStates = async () => {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((doc) => doc.data().name);
};

/**
 * Fetches activities and filters them by state
 */
export const fetchActivitiesByState = async (selectedState) => {
  const snapshot = await getDocs(collection(db, "activities"));
  const allActivities = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return allActivities.filter((activity) => activity.state === selectedState);
};