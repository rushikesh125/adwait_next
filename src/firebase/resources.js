// import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

/**
 * Fetch all states / locations
 */
export async function fetchLocations() {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Fetch all activities
 */
export async function fetchActivities() {
  const snapshot = await getDocs(collection(db, "activities"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
