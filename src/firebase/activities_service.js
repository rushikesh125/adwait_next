
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";
import { orgFilter } from "./orgScope";

/**
 * Fetches all unique state names from the 'locations' collection
 */
export const fetchAllStates = async (orgId = null) => {
  const snapshot = await getDocs(
    query(collection(db, "locations"), ...orgFilter(orgId)),
  );
  return snapshot.docs.map((doc) => doc.data().name);
};

export const fetchAllActivities = async (orgId = null) => {
  const snapshot = await getDocs(
    query(collection(db, "activities"), ...orgFilter(orgId)),
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetches activities filtered by state and org
 */
export const fetchActivitiesByState = async (selectedState, orgId = null) => {
  if (!selectedState) return [];
  const snapshot = await getDocs(
    query(
      collection(db, "activities"),
      where("state", "==", selectedState),
      ...orgFilter(orgId),
    ),
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
