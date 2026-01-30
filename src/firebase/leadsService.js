import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const leadsRef = collection(db, "leads");

// --- Existing Functions ---
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
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateLeadStatus = async (id, status) => {
  const ref = doc(db, "leads", id);
  await updateDoc(ref, { status });
};

// --- New Functions for Profile Page ---

export const getLeadById = async (id) => {
  const ref = doc(db, "leads", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getLeadNotes = async (lid) => {
  const notesRef = collection(db, "leads", lid, "notes");
  const q = query(notesRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLeadNote = async (lid, text, agentName) => {
  const notesRef = collection(db, "leads", lid, "notes");
  return await addDoc(notesRef, {
    text,
    createdBy: agentName,
    createdAt: serverTimestamp(),
  });
};

export const deleteLeadNote = async (lid, noteId) => {
  await deleteDoc(doc(db, "leads", lid, "notes", noteId));
};

export const updateLeadNote = async (lid, noteId, text) => {
  await updateDoc(doc(db, "leads", lid, "notes", noteId), { text });
};

// Assuming quotations are linked via leadId
export const getAgentQuotationsForLead = async (uid, lid) => {
  const q = query(collection(db, "saved_packages_by_agents",uid,"packages"), where("leadId", "==", lid));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};