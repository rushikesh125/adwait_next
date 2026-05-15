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
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";

const customersRef = collection(db, "customers");
const COLLECTION = "customers";
const PAGE_SIZE = 10;
const normalizeEmail = (email = "") => email.trim().toLowerCase();
const normalizeMobile = (mobile = "") => mobile.replace(/\D/g, "");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logError(context, error) {
  console.error(`[customersService] ${context}:`, error?.message ?? error);
}

// ─── Basic CRUD ───────────────────────────────────────────────────────────────

/**
 * Add a new customer document.
 * @param {Object} customerData - Customer fields.
 * @returns {Promise<import("firebase/firestore").DocumentReference>}
 */
export const addCustomer = async (customerData) => {
  try {
    const ref = await addDoc(customersRef, {
      ...customerData,
      normalizedEmail: normalizeEmail(customerData.email || ""),
      normalizedMobile: normalizeMobile(customerData.mobile || ""),
      createdAt: serverTimestamp(),
    });
    console.info(`[customersService] addCustomer: created ${ref.id}`);
    return ref;
  } catch (error) {
    logError("addCustomer", error);
    throw error;
  }
};

/**
 * Update an existing customer document.
 * @param {string} id - Document ID.
 * @param {Object} data - Fields to update.
 */
export const updateCustomer = async (id, data) => {
  try {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    console.info(`[customersService] updateCustomer: updated ${id}`);
  } catch (error) {
    logError("updateCustomer", error);
    throw error;
  }
};

/**
 * Delete a customer document.
 * @param {string} id - Document ID.
 */
export const deleteCustomer = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    console.info(`[customersService] deleteCustomer: deleted ${id}`);
  } catch (error) {
    logError("deleteCustomer", error);
    throw error;
  }
};

// ─── Fetch ALL (used for search across entire collection) ─────────────────────

/**
 * Fetch every customer — used when a search term is active.
 * Ordered by createdAt descending to match original behaviour.
 * @returns {Promise<Array>}
 */
export const getAllCustomers = async () => {
  try {
    const q = query(customersRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.info(`[customersService] getAllCustomers: fetched ${data.length} records`);
    return data;
  } catch (error) {
    logError("getAllCustomers", error);
    throw error;
  }
};

// ─── Single customer ──────────────────────────────────────────────────────────

/**
 * Get a single customer by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const getCustomerById = async (id) => {
  try {
    const ref = doc(db, COLLECTION, id);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    logError("getCustomerById", error);
    throw error;
  }
};

export const findExistingCustomerByEmailOrMobile = async ({ email, mobile }) => {
  try {
    const cleanEmail = normalizeEmail(email);
    const cleanMobile = normalizeMobile(mobile);

    if (cleanEmail) {
      const emailMatches = await Promise.all([
        getDocs(query(customersRef, where("normalizedEmail", "==", cleanEmail), limit(1))),
        getDocs(query(customersRef, where("email", "==", cleanEmail), limit(1))),
      ]);

      for (const snapshot of emailMatches) {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          return { id: docSnap.id, ...docSnap.data() };
        }
      }
    }

    if (cleanMobile) {
      const mobileMatches = await Promise.all([
        getDocs(query(customersRef, where("normalizedMobile", "==", cleanMobile), limit(1))),
        getDocs(query(customersRef, where("mobile", "==", cleanMobile), limit(1))),
      ]);

      for (const snapshot of mobileMatches) {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          return { id: docSnap.id, ...docSnap.data() };
        }
      }
    }

    return null;
  } catch (error) {
    logError("findExistingCustomerByEmailOrMobile", error);
    throw error;
  }
};

// ─── Quotations ───────────────────────────────────────────────────────────────

/**
 * Get quotations for a specific agent and customer.
 * @param {string} agentUid
 * @param {string} customerId
 * @returns {Promise<Array>}
 */
export const getAgentQuotationsForCustomer = async (agentUid, customerId) => {
  try {
    const quotesRef = collection(db, "saved_packages_by_agents", agentUid, "packages");
    const q = query(
      quotesRef,
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    logError("getAgentQuotationsForCustomer", error);
    throw error;
  }
};

export const getCustomerLeads = async (customerId) => {
  try {
    const q = query(collection(db, "leads"), where("customerId", "==", customerId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (error) {
    logError("getCustomerLeads", error);
    throw error;
  }
};

// ─── Notes ────────────────────────────────────────────────────────────────────

/**
 * Add a note to a specific customer.
 * @param {string} cid - Customer ID.
 * @param {string} noteText
 * @param {string} agentName
 */
export const addCustomerNote = async (cid, noteText, agentName) => {
  try {
    const notesRef = collection(db, COLLECTION, cid, "notes");
    return await addDoc(notesRef, {
      text: noteText,
      createdBy: agentName,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logError("addCustomerNote", error);
    throw error;
  }
};

/**
 * Fetch all notes for a customer.
 * @param {string} cid - Customer ID.
 * @returns {Promise<Array>}
 */
export const getCustomerNotes = async (cid) => {
  try {
    const notesRef = collection(db, COLLECTION, cid, "notes");
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    logError("getCustomerNotes", error);
    throw error;
  }
};

/**
 * Delete a specific note.
 * @param {string} cid - Customer ID.
 * @param {string} noteId
 */
export const deleteCustomerNote = async (cid, noteId) => {
  try {
    await deleteDoc(doc(db, COLLECTION, cid, "notes", noteId));
    console.info(`[customersService] deleteCustomerNote: deleted note ${noteId}`);
  } catch (error) {
    logError("deleteCustomerNote", error);
    throw error;
  }
};

/**
 * Update an existing note.
 * @param {string} cid - Customer ID.
 * @param {string} noteId
 * @param {string} newText
 */
export const updateCustomerNote = async (cid, noteId, newText) => {
  try {
    await updateDoc(doc(db, COLLECTION, cid, "notes", noteId), {
      text: newText,
      updatedAt: serverTimestamp(),
    });
    console.info(`[customersService] updateCustomerNote: updated note ${noteId}`);
  } catch (error) {
    logError("updateCustomerNote", error);
    throw error;
  }
};

// ─── Cursor-based Pagination ──────────────────────────────────────────────────

/**
 * Fetch the total number of customers using a metadata-only count query.
 * Does NOT download any documents — very cheap.
 * @returns {Promise<number>}
 */
export const getCustomersCount = async () => {
  try {
    const snap = await getCountFromServer(collection(db, COLLECTION));
    const count = snap.data().count;
    console.info(`[customersService] getCustomersCount: ${count}`);
    return count;
  } catch (error) {
    logError("getCustomersCount", error);
    throw error;
  }
};

/**
 * Fetch one page of customers using cursor-based pagination.
 *
 * @param {import("firebase/firestore").QueryDocumentSnapshot|null} cursorDoc
 *   The last document snapshot from the previous page, or null for the first page.
 * @param {number} [pageSize=PAGE_SIZE] - Records per page.
 * @returns {Promise<{ customers: Array, lastDoc: QueryDocumentSnapshot|null, hasMore: boolean }>}
 */
export const getCustomersPage = async (cursorDoc = null, pageSize = PAGE_SIZE) => {
  try {
    const constraints = [
      orderBy("createdAt", "desc"),
      ...(cursorDoc ? [startAfter(cursorDoc)] : []),
      limit(pageSize + 1), // +1 to detect whether a next page exists
    ];

    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs;

    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

    const customers = pageDocs.map((d) => ({ id: d.id, ...d.data() }));
    const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

    console.info(
      `[customersService] getCustomersPage: fetched ${customers.length} | hasMore=${hasMore}`
    );

    return { customers, lastDoc, hasMore };
  } catch (error) {
    logError("getCustomersPage", error);
    throw error;
  }
};

/**
 * Fetch the raw Firestore document snapshot for a given customer ID.
 * Useful for reconstructing a cursor when needed.
 * @param {string} id
 * @returns {Promise<import("firebase/firestore").DocumentSnapshot>}
 */
export const getCustomerDocSnapshot = async (id) => {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) throw new Error(`Customer ${id} not found`);
    return snap;
  } catch (error) {
    logError("getCustomerDocSnapshot", error);
    throw error;
  }
};
