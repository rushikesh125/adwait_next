// @/firebase/hotels.js
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";
import { orgFilter } from "./orgScope";

export const fetchAllHotels = async (orgId = null) => {
  try {
    const q = query(collection(db, "hotels"), ...orgFilter(orgId));
    const hotelsSnapshot = await getDocs(q);
    return hotelsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all hotels:", error);
    throw error;
  }
};

export const searchHotelsByName = async (searchText, orgId = null) => {
  try {
    if (!searchText) return [];

    const q = query(
      collection(db, "hotels"),
      ...orgFilter(orgId),
      where("name", ">=", searchText),
      where("name", "<=", searchText + "\uf8ff"),
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error searching hotels:", error);
    return [];
  }
};
