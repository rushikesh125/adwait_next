"use client";

import { useEffect } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { useDispatch, useSelector } from "react-redux";

import { doc, getDoc } from "firebase/firestore";
import { clearUser, setUser } from "@/store/authSlice";

const AuthSetup = () => {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.user);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let userData = null;
        let role = null;

        const adminRef = doc(db, "admins", currentUser.uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
          userData = adminSnap.data();
          role = "admin";
        } else {
          const agentRef = doc(db, "agents", currentUser.uid);
          const agentSnap = await getDoc(agentRef);
          if (agentSnap.exists()) {
            userData = agentSnap.data();
            role = "agent";
          }
        }

        if (userData) {
          const finalUser = { ...userData, uid: currentUser.uid, role };
          dispatch(setUser(finalUser));
        } else {
          dispatch(clearUser());
        }
      } else {
        dispatch(clearUser());
      }
    });

    return () => unsubscribe();
  }, []);
};

export default AuthSetup;
