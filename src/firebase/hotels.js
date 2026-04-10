// @/firebase/hotels.js
// import { db } from "@/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

export const fetchAllHotels = async () => {
  try {
    const hotelsSnapshot = await getDocs(collection(db, "hotels"));
    const hotelsList = hotelsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return hotelsList;
  } catch (error) {
    console.error("Error fetching all hotels:", error);
    throw error;
  }


};
export const searchHotelsByName = async (searchText) => {
  try {
    if (!searchText) return [];

    const q = query(
      collection(db, "hotels"),
      where("name", ">=", searchText),
      where("name", "<=", searchText + "\uf8ff")
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