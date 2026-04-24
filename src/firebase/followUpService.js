import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// 📍 Collection path: leads/{leadId}/followups
const getFollowUpRef = (leadId) =>
  collection(db, "leads", leadId, "followups");

// ✅ CREATE FOLLOW-UP
export const addFollowUp = async (leadId, data) => {
  if (!leadId) throw new Error("Lead ID is required");

  try {
    const ref = await addDoc(getFollowUpRef(leadId), {
      ...data,
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  } catch (error) {
    console.error("[FollowUp] add error:", error);
    throw error;
  }
};

// ✅ GET FOLLOW-UPS
export const getFollowUpsForLead = async (leadId) => {
  if (!leadId) return [];

  try {
    const q = query(
      getFollowUpRef(leadId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("[FollowUp] fetch error:", error);
    return [];
  }
};

// ✅ UPDATE
export const updateFollowUp = async (leadId, followUpId, data) => {
  if (!leadId || !followUpId) return;

  try {
    await updateDoc(
      doc(db, "leads", leadId, "followups", followUpId),
      {
        ...data,
        updatedAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("[FollowUp] update error:", error);
    throw error;
  }
};

// ✅ DELETE
export const deleteFollowUp = async (leadId, followUpId) => {
  if (!leadId || !followUpId) return;

  try {
    await deleteDoc(
      doc(db, "leads", leadId, "followups", followUpId)
    );
  } catch (error) {
    console.error("[FollowUp] delete error:", error);
    throw error;
  }
};