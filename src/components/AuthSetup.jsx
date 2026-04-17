"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { useDispatch } from "react-redux";
import { doc, getDoc } from "firebase/firestore";
import { clearUser, setUser, setInitialized } from "@/store/authSlice";

const AuthSetup = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let userData = null;
        let role = null;

        const [superAdminSnap, adminSnap, agentSnap] = await Promise.all([
          getDoc(doc(db, "super_admins", currentUser.uid)),
          getDoc(doc(db, "admins", currentUser.uid)),
          getDoc(doc(db, "agents", currentUser.uid)),
        ]);

        if (superAdminSnap.exists()) {
          userData = superAdminSnap.data();
          role = "superadmin";
        } else if (adminSnap.exists()) {
          userData = adminSnap.data();
          role = "admin";
        } else if (agentSnap.exists()) {
          userData = agentSnap.data();
          role = "agent";
        }

        if (userData) {
          // Sync state with found user and role
          const finalUser = {
            ...userData,
            uid: currentUser.uid,
            role,
            providerIds:
              currentUser.providerData?.map(
                (provider) => provider.providerId,
              ) || [],
            emailVerified: currentUser.emailVerified,
          };
          dispatch(setUser(finalUser));
        } else {
          // User authenticated but no document found in any role collection
          dispatch(clearUser());
        }
      } else {
        // No user authenticated
        dispatch(clearUser());
      }
      // ✅ VERY IMPORTANT
      dispatch(setInitialized());
    });

    return () => unsubscribe();
  }, [dispatch]);
};

export default AuthSetup;
