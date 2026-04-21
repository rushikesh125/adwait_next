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
  orderBy,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "payment_accounts";

function logError(context, error) {
  console.error(`[paymentAccountsService] ${context}:`, error?.message ?? error);
}

export const createPaymentAccount = async (agentId, data) => {
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...data,
      agentId,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    logError("createPaymentAccount", e);
    throw e;
  }
};

export const getPaymentAccountsByAgent = async (agentId) => {
  try {
    // Simple query on agentId only — avoid compound index requirement
    const q = query(
      collection(db, COLLECTION),
      where("agentId", "==", agentId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => a.isActive !== false)
      .sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return ta - tb;
      });
  } catch (e) {
    logError("getPaymentAccountsByAgent", e);
    throw e;
  }
};

export const getPaymentAccountById = async (id) => {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    logError("getPaymentAccountById", e);
    throw e;
  }
};

export const updatePaymentAccount = async (id, data) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    logError("updatePaymentAccount", e);
    throw e;
  }
};

export const deletePaymentAccount = async (id) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    logError("deletePaymentAccount", e);
    throw e;
  }
};

export const setDefaultPaymentAccount = async (agentId, accountId) => {
  try {
    const accounts = await getPaymentAccountsByAgent(agentId);
    const updates = accounts.map((acc) =>
      updateDoc(doc(db, COLLECTION, acc.id), {
        isDefault: acc.id === accountId,
        updatedAt: serverTimestamp(),
      })
    );
    await Promise.all(updates);
  } catch (e) {
    logError("setDefaultPaymentAccount", e);
    throw e;
  }
};
