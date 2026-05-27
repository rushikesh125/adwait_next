// import { db } from "@/firebase/config";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "./config";
import { orgFilter } from "./orgScope";

/**
 * Fetch all states / locations
 */
export async function fetchLocations(orgId = null) {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Fetch all activities
 */
export async function fetchActivities(orgId = null) {
  const snapshot = await getDocs(query(collection(db, "activities"), ...orgFilter(orgId)));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
