import { db } from "./config";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

const USER_COLLECTIONS = [
  { name: "super_admins", role: "superadmin" },
  { name: "admins", role: "admin" },
  { name: "agents", role: "agent" },
  { name: "users", role: null },
];

export const getUserData = async (uid) => {
  if (!uid) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};

export const getUserRecordByUid = async (uid) => {
  if (!uid) return null;

  const snapshots = await Promise.all(
    USER_COLLECTIONS.map((entry) => getDoc(doc(db, entry.name, uid)))
  );

  for (let i = 0; i < USER_COLLECTIONS.length; i++) {
    if (snapshots[i].exists()) {
      const entry = USER_COLLECTIONS[i];
      return {
        id: snapshots[i].id,
        collection: entry.name,
        role: entry.role || snapshots[i].data().role || null,
        ...snapshots[i].data(),
      };
    }
  }

  return null;
};

export const getUserRecordByEmail = async (email) => {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  const snapshots = await Promise.all(
    USER_COLLECTIONS.map((entry) =>
      getDocs(query(collection(db, entry.name), where("email", "==", cleanEmail), limit(1)))
    )
  );

  for (let i = 0; i < USER_COLLECTIONS.length; i++) {
    if (!snapshots[i].empty) {
      const record = snapshots[i].docs[0];
      const entry = USER_COLLECTIONS[i];
      return {
        id: record.id,
        collection: entry.name,
        role: entry.role || record.data().role || null,
        ...record.data(),
      };
    }
  }

  return null;
};

export const updateUserAuthMetadata = async (uid, data) => {
  const record = await getUserRecordByUid(uid);
  if (!record?.collection) {
    throw new Error("User profile not found");
  }

  await updateDoc(doc(db, record.collection, uid), data);
};

export const normalizeEnquirySlug = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const isValidEnquirySlug = (value) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export const getAgentByEnquiryIdentifier = async (identifier) => {
  if (!identifier) return null;

  const rawValue = String(identifier).trim();
  if (!rawValue) return null;

  const uidSnapshot = await getDoc(doc(db, "agents", rawValue));
  if (uidSnapshot.exists()) {
    return { id: uidSnapshot.id, ...uidSnapshot.data() };
  }

  const slug = normalizeEnquirySlug(rawValue);
  if (!slug) return null;

  const slugSnapshot = await getDocs(
    query(collection(db, "agents"), where("enquirySlug", "==", slug), limit(1)),
  );

  if (slugSnapshot.empty) return null;

  const record = slugSnapshot.docs[0];
  return { id: record.id, ...record.data() };
};

// Looks up an admin by UID or enquirySlug (same pattern as agents)
export const getAdminByEnquiryIdentifier = async (identifier) => {
  if (!identifier) return null;
  const rawValue = String(identifier).trim();
  if (!rawValue) return null;

  const uidSnapshot = await getDoc(doc(db, "admins", rawValue));
  if (uidSnapshot.exists()) {
    return { id: uidSnapshot.id, role: "admin", ...uidSnapshot.data() };
  }

  const slug = normalizeEnquirySlug(rawValue);
  if (!slug) return null;

  const slugSnapshot = await getDocs(
    query(collection(db, "admins"), where("enquirySlug", "==", slug), limit(1))
  );
  if (slugSnapshot.empty) return null;
  const record = slugSnapshot.docs[0];
  return { id: record.id, role: "admin", ...record.data() };
};

// Resolves an enquiry identifier against agents first, then admins.
// Returns { owner, ownerType } where ownerType is "agent" | "admin".
export const getEnquiryOwner = async (identifier) => {
  const agent = await getAgentByEnquiryIdentifier(identifier);
  if (agent) return { owner: agent, ownerType: "agent" };
  const admin = await getAdminByEnquiryIdentifier(identifier);
  if (admin) return { owner: admin, ownerType: "admin" };
  return null;
};

export const updateAdminEnquirySlug = async (uid, slug) => {
  if (!uid) throw new Error("Admin profile not found");
  const normalizedSlug = normalizeEnquirySlug(slug);
  if (!normalizedSlug) {
    await updateDoc(doc(db, "admins", uid), { enquirySlug: deleteField() });
    return "";
  }
  if (normalizedSlug.length < 3 || normalizedSlug.length > 40)
    throw new Error("Enquiry link slug must be between 3 and 40 characters.");
  if (!isValidEnquirySlug(normalizedSlug))
    throw new Error("Use only lowercase letters, numbers, and hyphens.");
  const existing = await getDocs(
    query(collection(db, "admins"), where("enquirySlug", "==", normalizedSlug), limit(1))
  );
  if (existing.docs[0] && existing.docs[0].id !== uid)
    throw new Error("This enquiry link is already in use.");
  await updateDoc(doc(db, "admins", uid), { enquirySlug: normalizedSlug });
  return normalizedSlug;
};

export const updateAgentEnquirySlug = async (uid, slug) => {
  if (!uid) {
    throw new Error("Agent profile not found");
  }

  const normalizedSlug = normalizeEnquirySlug(slug);

  if (!normalizedSlug) {
    await updateDoc(doc(db, "agents", uid), { enquirySlug: deleteField() });
    return "";
  }

  if (normalizedSlug.length < 3 || normalizedSlug.length > 40) {
    throw new Error("Enquiry link slug must be between 3 and 40 characters.");
  }

  if (!isValidEnquirySlug(normalizedSlug)) {
    throw new Error("Use only lowercase letters, numbers, and hyphens.");
  }

  const existingSlugSnapshot = await getDocs(
    query(collection(db, "agents"), where("enquirySlug", "==", normalizedSlug), limit(1)),
  );

  const existingRecord = existingSlugSnapshot.docs[0];
  if (existingRecord && existingRecord.id !== uid) {
    throw new Error("This enquiry link is already in use. Please choose another one.");
  }

  await updateDoc(doc(db, "agents", uid), { enquirySlug: normalizedSlug });
  return normalizedSlug;
};
