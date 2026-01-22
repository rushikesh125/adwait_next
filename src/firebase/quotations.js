// src/firebase/quotations/quotations.firebase.js


import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "./config";

/* ──────────────────────────────────────────────
   QUOTATIONS CRUD
────────────────────────────────────────────── */

/**
 * Fetch quotations for an agent
 */
export async function fetchQuotationsByAgent(agentId) {
  if (!agentId) return [];

  try {
    const ref = collection(
      db,
      "saved_packages_by_agents",
      agentId,
      "packages"
    );

    const q = query(ref, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const total = snapshot.docs.length;

    return snapshot.docs
      .map((docSnap, index) => ({
        id: docSnap.id,
        quoteNumber: total - index,
        ...docSnap.data(),
      }))
      .filter((q) => q.packageName !== null);
  } catch (error) {
    console.error("❌ fetchQuotationsByAgent:", error);
    throw error;
  }
}

/**
 * Update existing quotation
 */
export async function updateQuotation(agentId, quotationId, data) {
  if (!agentId || !quotationId) {
    throw new Error("Missing agentId or quotationId");
  }

  const ref = doc(
    db,
    "saved_packages_by_agents",
    agentId,
    "packages",
    quotationId
  );

  await updateDoc(ref, data);
}

/**
 * Delete quotation
 */
export async function deleteQuotation(agentId, quotationId) {
  if (!agentId || !quotationId) {
    throw new Error("Missing agentId or quotationId");
  }

  await deleteDoc(
    doc(db, "saved_packages_by_agents", agentId, "packages", quotationId)
  );
}

/**
 * Save quotation as new (Save As)
 */
export async function saveQuotationAs(agentId, quotationData) {
  if (!agentId) {
    throw new Error("Agent not authenticated");
  }

  const ref = collection(
    db,
    "saved_packages_by_agents",
    agentId,
    "packages"
  );

  return await addDoc(ref, {
    ...quotationData,
    createdAt: new Date(),
  });
}

/* ──────────────────────────────────────────────
   LOOKUPS (READ-ONLY)
────────────────────────────────────────────── */

/**
 * Fetch all hotels
 */
export async function fetchAllHotels() {
  const snapshot = await getDocs(collection(db, "hotels"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch all destinations
 */
export async function fetchAllDestinations() {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch transport states
 */
export async function fetchTransportStates() {
  const snapshot = await getDocs(collection(db, "transport"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch transport packages for a state
 */
export async function fetchTransportPackagesByState(stateId) {
  if (!stateId) return [];

  const snapshot = await getDocs(
    collection(db, "transport", stateId, "packages")
  );

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch activities by state
 */
export async function fetchActivitiesByState(state) {
  if (!state) return [];

  const q = query(
    collection(db, "activities"),
    where("state", "==", state)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
