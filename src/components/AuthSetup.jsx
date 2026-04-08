"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { useDispatch } from "react-redux";
import { doc, getDoc } from "firebase/firestore";
import { clearUser, setUser } from "@/store/authSlice";

const AuthSetup = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let userData = null;
        let role = null;

        // 1. Check Super Admins first (highest priority)
        const superAdminRef = doc(db, "super_admins", currentUser.uid);
        const superAdminSnap = await getDoc(superAdminRef);

        if (superAdminSnap.exists()) {
          userData = superAdminSnap.data();
          role = "superadmin";
        } else {
          // 2. Check Admins
          const adminRef = doc(db, "admins", currentUser.uid);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            userData = adminSnap.data();
            role = "admin";
          } else {
            // 3. Check Agents
            const agentRef = doc(db, "agents", currentUser.uid);
            const agentSnap = await getDoc(agentRef);

            if (agentSnap.exists()) {
              userData = agentSnap.data();
              role = "agent";
            }
          }
        }

        if (userData) {
          // Sync state with found user and role
          const finalUser = {
            ...userData,
            uid: currentUser.uid,
            role,
            providerIds: currentUser.providerData?.map((provider) => provider.providerId) || [],
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
    });

    return () => unsubscribe();
  }, [dispatch]);

};

export default AuthSetup;
