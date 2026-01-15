
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

/**
 * Saves a complete package itinerary to Firestore
 * @param {Object} packageData - The full state from the CreatePackage component
 */
export const createNewPackage = async (packageData) => {
  try {
    const docRef = await addDoc(collection(db, "created_packages"), {
      ...packageData,
      createdAt: serverTimestamp(),
      status: "draft", // or "active"
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating package:", error);
    throw error;
  }
};