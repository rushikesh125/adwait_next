import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "bookings";

function logError(context, error) {
  console.error(`[bookingsService] ${context}:`, error?.message ?? error);
}

export const generateBookingRef = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${year}-${rand}`;
};

export const computePaymentStatus = (totalAmount, paidAmount) => {
  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partial";
};

export const createBooking = async (data) => {
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...data,
      bookingRef: generateBookingRef(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    logError("createBooking", e);
    throw e;
  }
};

export const getBookingsByAgent = async (agentId) => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("agentId", "==", agentId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    logError("getBookingsByAgent", e);
    throw e;
  }
};

export const getBookingById = async (id) => {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    logError("getBookingById", e);
    throw e;
  }
};

export const updateBooking = async (id, data) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    logError("updateBooking", e);
    throw e;
  }
};

export const updateBookingStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    logError("updateBookingStatus", e);
    throw e;
  }
};

export const deleteBooking = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (e) {
    logError("deleteBooking", e);
    throw e;
  }
};
