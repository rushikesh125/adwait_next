// @/firebase/hotels.js
// import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
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