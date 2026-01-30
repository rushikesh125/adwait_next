import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  where,
  deleteDoc,
} from "firebase/firestore";
const customersRef = collection(db, "customers");

export const udpateCustomer = async(id, data)=>{
  const ref = doc( db, "customers", id);
  await updateDoc(ref, data);
};

export const addCustomer = async (customerData) => {
     return await addDoc(customersRef, {
    ...customerData,
    createdAt: serverTimestamp(),
  });
};

export const getAllCustomers = async () => {
  const q = query(customersRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
// Get single customer
export const getCustomerById = async (id) => {
  const ref = doc(db, "customers", id);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

// Get quotations only for the logged-in agent and specific customer
export const getAgentQuotationsForCustomer = async (agentUid, customerId) => {
  const quotesRef = collection(db, "saved_packages_by_agents", agentUid, "packages");
  const q = query(
    quotesRef, 
    where("customerId", "==", customerId), 
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Add a note to a specific customer
export const addCustomerNote = async (cid, noteText, agentName) => {
  const notesRef = collection(db, "customers", cid, "notes");
  return await addDoc(notesRef, {
    text: noteText,
    createdBy: agentName,
    createdAt: serverTimestamp(),
  });
};

// Fetch all notes for a customer
export const getCustomerNotes = async (cid) => {
  const notesRef = collection(db, "customers", cid, "notes");
  const q = query(notesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Delete a specific note
export const deleteCustomerNote = async (cid, noteId) => {
  const noteRef = doc(db, "customers", cid, "notes", noteId);
  await deleteDoc(noteRef);
};

// Update an existing note
export const updateCustomerNote = async (cid, noteId, newText) => {
  const noteRef = doc(db, "customers", cid, "notes", noteId);
  await updateDoc(noteRef, { 
    text: newText,
    updatedAt: serverTimestamp() 
  });
};