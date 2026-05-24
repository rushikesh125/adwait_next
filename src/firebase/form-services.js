import { db } from "./config";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { belongsToOrg } from "./orgScope";

/**
 * Creates a new trip form in Firestore
 */
export const createTripForm = async (agentId, tripData) => {
  try {
    if (!tripData?.orgId) {
      throw new Error("Organization is required to create a trip form");
    }
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
export const getTripById = async (tripId, orgId = null) => {
  try {
    const docRef = doc(db, "trips", tripId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return belongsToOrg(data, orgId) ? { id: docSnap.id, ...data } : null;
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
export const updateTripForm = async (tripId, updateData, orgId = null) => {
  try {
    const docRef = doc(db, "trips", tripId);
    if (orgId) {
      const existing = await getDoc(docRef);
      if (!existing.exists() || !belongsToOrg(existing.data(), orgId)) {
        throw new Error("Trip does not belong to this organization");
      }
    }
    await updateDoc(docRef, {
      ...updateData,
      ...(orgId ? { orgId } : {}),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
};
