"use client";

/**
 * useAgentPermissions — role-aware AI feature permissions hook
 *
 * Collection routing:
 *   role === "agent"      → reads/writes  agentPermissions/{uid}
 *   role === "admin"      → reads/writes  adminPermissions/{uid}
 *   role === "superadmin" → always full access, no Firestore read
 *   role === undefined    → falls back to agentPermissions/{uid}
 *                           (backward-compat for call sites that don't pass role)
 *
 * Public API is IDENTICAL to the original hook — no consumer changes needed.
 */

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants (exported so managers + consumers can import from one place)
// ─────────────────────────────────────────────────────────────────────────────

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

/** Maps role → Firestore collection name. */
const ROLE_COLLECTION = {
  agent: "agentPermissions",
  admin: "adminPermissions",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string|null|undefined} uid  — Firebase Auth UID of the current user
 * @param {string|null|undefined} role — "agent" | "admin" | "superadmin"
 *
 * When `role` is omitted the hook behaves exactly like the original version
 * (reads agentPermissions) so existing call sites need zero changes.
 */
export function useAgentPermissions(uid, role) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetchPermissions = useCallback(async () => {
    // ── No uid — resolve to defaults immediately ──────────────────────────
    if (!uid) {
      setPermissions({ ...DEFAULT_PERMISSIONS });
      setLoading(false);
      return;
    }

    // ── SuperAdmin — always full access, skip any Firestore read ─────────
    if (role === "superadmin") {
      const fullAccess = Object.fromEntries(
        Object.keys(DEFAULT_PERMISSIONS).map((k) => [k, true])
      );
      setPermissions(fullAccess);
      setLoading(false);
      return;
    }

    // ── Determine which collection to use ─────────────────────────────────
    // Default to "agentPermissions" when role is not supplied so the hook
    // stays backward-compatible with call sites that only pass uid.
    const collectionName = ROLE_COLLECTION[role] ?? "agentPermissions";

    setLoading(true);
    setError(null);

    try {
      const ref  = doc(db, collectionName, uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const savedData = snap.data();

        // Start from defaults so any newly-added keys are always present.
        // Only accept strict booleans — guards against corrupt Firestore data.
        const merged = { ...DEFAULT_PERMISSIONS };
        Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
          if (key in savedData) {
            merged[key] = savedData[key] === true;
          }
        });

        setPermissions(merged);
      } else {
        // Document doesn't exist yet — bootstrap it with all-false defaults
        // so SuperAdmin's manager UI immediately has a doc to toggle.
        try {
          await setDoc(ref, DEFAULT_PERMISSIONS);
        } catch (writeErr) {
          // Write may fail under restrictive Firestore rules (e.g. agent
          // does not have write access to their own perms doc). That's fine —
          // we still apply safe in-memory defaults.
          console.warn(
            `[useAgentPermissions] Could not bootstrap ${collectionName}/${uid}:`,
            writeErr.code ?? writeErr.message
          );
        }
        setPermissions({ ...DEFAULT_PERMISSIONS });
      }
    } catch (err) {
      const code = err.code ?? "";
      const isAuthError =
        code === "permission-denied" || code === "unauthenticated";

      console.error(
        `[useAgentPermissions] Failed to fetch ${collectionName}/${uid}:`,
        err.code,
        err.message
      );

      setError(
        isAuthError
          ? "Permission denied loading feature access."
          : "Failed to load permissions."
      );

      // Always fall back to restrictive defaults — UI stays functional
      setPermissions({ ...DEFAULT_PERMISSIONS });
    } finally {
      setLoading(false);
    }
  }, [uid, role]); // re-run whenever uid OR role changes

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * hasPermission(key) → boolean
   * Returns true only when:
   *   • not loading
   *   • permissions resolved
   *   • stored value is exactly `true` (no truthy coercion)
   */
  const hasPermission = useCallback(
    (key) => {
      if (loading || permissions === null) return false;
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_PERMISSIONS, key)) {
        console.warn(`[useAgentPermissions] Unknown permission key: "${key}"`);
        return false;
      }
      return permissions[key] === true;
    },
    [permissions, loading]
  );

  return { permissions, loading, error, hasPermission, refetch: fetchPermissions };
}