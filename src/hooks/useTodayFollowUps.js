// hooks/useTodayFollowUps.js
// Queries leads/*/followups across all leads via collectionGroup.
// Returns only Pending follow-ups that are within 2 hours of due time
// (upcoming) OR already overdue. Refreshes the client-side filter
// every 60s so items enter/leave the window automatically.

import { useEffect, useState } from "react";
import { collectionGroup, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function isInWindow(fu) {
  if (!fu.dateTime) return false;
  const due = new Date(fu.dateTime);
  const now = new Date();
  // Show if due time is ≤ 2 hours away (future), OR already past (overdue)
  return due <= new Date(now.getTime() + TWO_HOURS_MS);
}

export function useTodayFollowUps(userId) {
  const [allPending, setAllPending] = useState([]);
  const [followUps, setFollowUps]   = useState([]);
  const [isLoading, setIsLoading]   = useState(true);

  // ── Firestore live listener ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    // Requires a composite index:
    //   Collection group: followups | agentId ASC | dateTime ASC
    // Firestore will log an error with a direct "Create index" link on first run.
    const q = query(
      collectionGroup(db, "followups"),
      where("agentId", "==", userId),
      where("status",  "==", "Pending"),
      orderBy("dateTime", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => {
          // Path shape: leads/{leadId}/followups/{docId}
          const leadId = d.ref.path.split("/")[1];
          return { id: d.id, leadId, ...d.data() };
        });
        setAllPending(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error("[useTodayFollowUps] snapshot error:", err);
        // If the composite index is missing Firestore throws here with a
        // clickable link in the console to create it automatically.
        setIsLoading(false);
      }
    );

    return unsub;
  }, [userId]);

  // ── Re-apply window filter whenever allPending changes ───────────────────
  useEffect(() => {
    setFollowUps(allPending.filter(isInWindow));
  }, [allPending]);

  // ── Tick every 60s so items enter/leave the 2hr window automatically ─────
  useEffect(() => {
    const id = setInterval(() => {
      setFollowUps(allPending.filter(isInWindow));
    }, 60_000);
    return () => clearInterval(id);
  }, [allPending]);

  return { followUps, isLoading };
}