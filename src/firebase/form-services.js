import { db } from "./config";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * Creates a new trip form in Firestore
 */
export const createTripForm = async (agentId, tripData) => {
  try {
    const docRef = await addDoc(collection(db, "trips"), {
      ...tripData,
      agentId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};

/**
 * Fetches a single trip by its Document ID
 */
export const getTripById = async (tripId) => {
  try {
    const docRef = doc(db, "trips", tripId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.warn("No such trip found!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching trip:", error);
    throw error;
  }
};

/**
 * Updates an existing trip form
 */
export const updateTripForm = async (tripId, updateData) => {
  try {
    const docRef = doc(db, "trips", tripId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
};