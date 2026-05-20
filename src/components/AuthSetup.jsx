"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { useDispatch } from "react-redux";
import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { clearUser, setUser, setInitialized } from "@/store/authSlice";
import { backfillAdminReferences } from "@/firebase/adminService";
import { getOrganization } from "@/firebase/organizationService";

const ROLE_COLLECTIONS = [
  { name: "super_admins", role: "superadmin" },
  { name: "admins", role: "admin" },
  { name: "agents", role: "agent" },
];

async function resolveUserDoc(uid, email) {
  // 1. Fast path: document ID == Firebase Auth UID
  const snapshots = await Promise.all(
    ROLE_COLLECTIONS.map((c) => getDoc(doc(db, c.name, uid)))
  );
  for (let i = 0; i < ROLE_COLLECTIONS.length; i++) {
    if (snapshots[i].exists()) {
      const data = snapshots[i].data();
      if (!data.uid) updateDoc(snapshots[i].ref, { uid }).catch(() => {});
      return { data: { ...data, uid }, role: ROLE_COLLECTIONS[i].role, docId: snapshots[i].id };
    }
  }

  // 2. Fallback: find by uid field
  const byUid = await Promise.all(
    ROLE_COLLECTIONS.map((c) =>
      getDocs(query(collection(db, c.name), where("uid", "==", uid), limit(1)))
    )
  );
  for (let i = 0; i < ROLE_COLLECTIONS.length; i++) {
    if (!byUid[i].empty) {
      const snap = byUid[i].docs[0];
      return { data: snap.data(), role: ROLE_COLLECTIONS[i].role, docId: snap.id };
    }
  }

  // 3. Last resort: find by email, write correct uid field so future logins use fast path
  if (email) {
    const byEmail = await Promise.all(
      ROLE_COLLECTIONS.map((c) =>
        getDocs(query(collection(db, c.name), where("email", "==", email.toLowerCase()), limit(1)))
      )
    );
    for (let i = 0; i < ROLE_COLLECTIONS.length; i++) {
      if (!byEmail[i].empty) {
        const snap = byEmail[i].docs[0];
        updateDoc(snap.ref, { uid }).catch(() => {});
        return { data: { ...snap.data(), uid }, role: ROLE_COLLECTIONS[i].role, docId: snap.id };
      }
    }
  }

  console.warn("[AuthSetup] No Firestore document found for uid:", uid, "email:", email);
  return null;
}

const AuthSetup = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const resolved = await resolveUserDoc(currentUser.uid, currentUser.email);
          if (resolved) {
            // When an admin's Firestore doc ID doesn't match their Firebase Auth UID
            // (found via email fallback), backfill all related records to use the correct uid.
            if (resolved.role === "admin" && resolved.docId !== currentUser.uid) {
              await backfillAdminReferences(resolved.docId, currentUser.uid).catch(() => {});
            }
            let organization = null;
            if (resolved.data.orgId) {
              organization = await getOrganization(resolved.data.orgId).catch(() => null);
            }
            dispatch(setUser({
              ...resolved.data,
              orgName: organization?.name || resolved.data.orgName || null,
              uid: currentUser.uid,
              role: resolved.role,
              providerIds: currentUser.providerData?.map((p) => p.providerId) || [],
              emailVerified: currentUser.emailVerified,
            }));
          } else {
            dispatch(clearUser());
          }
        } else {
          dispatch(clearUser());
        }
      } catch (error) {
        console.error("[AuthSetup] Failed to resolve user profile:", error);
        dispatch(clearUser());
      } finally {
        dispatch(setInitialized());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);
};

export default AuthSetup;
