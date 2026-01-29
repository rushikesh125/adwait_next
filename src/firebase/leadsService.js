import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
orderBy,
doc,
updateDoc,
  query,
  serverTimestamp,
} from "firebase/firestore";

const leadsRef = collection(db, "leads");

export const addLead = async (data) => {
  await addDoc(leadsRef, {
    ...data,
    createdAt: serverTimestamp(),
    status: "New",
  });
};

export const getAllLeads = async () => {
  const q = query(leadsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
export const updateLeadStatus = async (id, status) => {
  const ref = doc(db, "leads", id);
  await updateDoc(ref, { status });
};