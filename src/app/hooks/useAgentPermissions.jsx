"use client";
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export const DEFAULT_PERMISSIONS = {
  itinerary_ai: false,
  hotel_fetch_ai: false,
};

export const PERMISSION_META = {
  itinerary_ai: {
    label: "AI Itinerary Creation",
    description: "Generate day-by-day itineraries using Gemini AI",
    icon: "CalendarDays",
  },
  hotel_fetch_ai: {
    label: "Hotel Address, Map link & Contact Fetch",
    description: "Auto-lookup hotel address, phone and map link via API",
    icon: "Hotel",
  },
};

export function useAgentPermissions(uid) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ref = doc(db, "agentPermissions", uid);
      const snap = await getDoc(ref);
      

      if (snap.exists()) {
        const savedData = snap.data();
        
        const merged = { ...DEFAULT_PERMISSIONS, ...savedData };
        setPermissions(merged);
      } else {
        await setDoc(ref, DEFAULT_PERMISSIONS);
        setPermissions({ ...DEFAULT_PERMISSIONS });
      }
    } catch (err) {
      console.error("[useAgentPermissions] Failed to fetch:", err);
      setError("Failed to load permissions.");
      setPermissions({ ...DEFAULT_PERMISSIONS }); // safe fallback
    } finally {
      setLoading(false);
    }
  }, [uid]);
  

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);
  

  const hasPermission = useCallback(
    (key) => {
      if (loading || permissions === null) return false;
      return permissions[key] === true;
    },
    [permissions, loading]
  );

  return { permissions, loading, error, hasPermission, refetch: fetchPermissions };
}