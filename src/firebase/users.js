import { db } from "./config";
import {
  collection,
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

  for (const entry of USER_COLLECTIONS) {
    const snapshot = await getDoc(doc(db, entry.name, uid));
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        collection: entry.name,
        role: entry.role || snapshot.data().role || null,
        ...snapshot.data(),
      };
    }
  }

  return null;
};

export const getUserRecordByEmail = async (email) => {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  for (const entry of USER_COLLECTIONS) {
    const snapshot = await getDocs(
      query(collection(db, entry.name), where("email", "==", cleanEmail), limit(1)),
    );

    if (!snapshot.empty) {
      const record = snapshot.docs[0];
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
