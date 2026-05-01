// ── hooks/useNotifications.js ─────────────────────────────────────────────────
// Single hook that manages:
//   - Firestore notification subscription
//   - Follow-up polling (every 5 minutes)
//   - Browser notification permission + display
//   - New notification sound
//   - SW registration (once per app)

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  subscribeToNotifications,
  showBrowserNotification,
  playNotificationSound,
  requestNotificationPermission,
  registerServiceWorker,
} from "@/firebase/notificationsService";

// ── Constants ─────────────────────────────────────────────────────────────────
const FOLLOWUP_POLL_INTERVAL = 5 * 60 * 1000; // 5 min
const SOON_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hrs

// ── Follow-up fetcher (extracted, reusable) ───────────────────────────────────
async function fetchDueFollowUps(userId) {
  const leadsSnap = await getDocs(
    query(collection(db, "leads"), where("agentId", "==", userId))
  );

  const now = new Date();
  const soonThreshold = new Date(now.getTime() + SOON_THRESHOLD_MS);
  const reminders = [];

  await Promise.all(
    leadsSnap.docs.map(async (leadDoc) => {
      const lead = { id: leadDoc.id, ...leadDoc.data() };

      // Resolve mobile from lead or linked customer
      let mobile = lead.mobile || lead.phone || lead.contact || "";
      if (!mobile && lead.customerId) {
        try {
          const customerSnap = await getDoc(doc(db, "customers", lead.customerId));
          if (customerSnap.exists()) {
            const c = customerSnap.data();
            mobile = c.mobile || c.phone || c.contact || "";
          }
        } catch {}
      }

      const fuSnap = await getDocs(collection(db, "leads", lead.id, "followups"));
      fuSnap.docs.forEach((d) => {
        const fu = { id: d.id, leadId: lead.id, ...d.data() };
        if (fu.status === "Completed") return;

        const dt = fu.dateTime?.toDate
          ? fu.dateTime.toDate()
          : fu.dateTime
          ? new Date(fu.dateTime)
          : null;

        if (!dt || dt > soonThreshold) return;

        reminders.push({
          ...fu,
          isOverdue: dt < now,
          dueDate: dt,
          leadName: lead.name || fu.leadName || "Lead",
          leadMobile: mobile,
        });
      });
    })
  );

  return reminders.sort((a, b) => a.dueDate - b.dueDate);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [permissionState, setPermissionState] = useState("default"); // "granted"|"denied"|"default"|"unsupported"
  const [isLoading, setIsLoading] = useState(true);
  const pollTimer = useRef(null);

  // ── 1. Register SW once ───────────────────────────────────────────────────
  useEffect(() => {
    registerServiceWorker();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  // ── 2. Subscribe to Firestore notifications ───────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToNotifications(
      userId,
      // onList
      (all) => {
        setNotifications(all);
        setIsLoading(false);
      },
      // onNew — fires only for genuinely new unread notifications
      (newNotif) => {
        playNotificationSound();

        // Show browser notification if tab is in background
        if (document.visibilityState === "hidden" || !document.hasFocus()) {
          showBrowserNotification({
            title: newNotif.title,
            body: newNotif.message,
            tag: newNotif.type ?? "general",
            url: newNotif.link ?? "/agent-panel",
            requireInteraction: newNotif.priority === "high",
            actions: [
              { action: "view", title: "View" },
              { action: "dismiss", title: "Dismiss" },
            ],
          });
        }
      }
    );

    return unsub;
  }, [userId]);

  // ── 3. Follow-up polling ──────────────────────────────────────────────────
  const pollFollowUps = useCallback(async () => {
    if (!userId) return;
    try {
      const results = await fetchDueFollowUps(userId);
      setFollowUps((prev) => {
        // Only show browser notification for newly overdue items
        const prevIds = new Set(prev.map((f) => f.id));
        const newOverdue = results.filter(
          (f) => f.isOverdue && !prevIds.has(f.id)
        );
        if (newOverdue.length > 0) {
          showBrowserNotification({
            title: `⏰ ${newOverdue.length} Overdue Follow-up${newOverdue.length > 1 ? "s" : ""}`,
            body: newOverdue.map((f) => f.leadName).join(", "),
            tag: "followup-overdue",
            url: `/agent-panel/leads/${newOverdue[0].leadId}`,
            requireInteraction: true,
          });
          playNotificationSound();
        }
        return results;
      });
    } catch (err) {
      console.error("[useNotifications] Follow-up fetch error:", err);
    }
  }, [userId]);

  useEffect(() => {
    pollFollowUps(); // immediate on mount
    pollTimer.current = setInterval(pollFollowUps, FOLLOWUP_POLL_INTERVAL);

    // Also re-poll when the tab regains focus
    const onFocus = () => pollFollowUps();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(pollTimer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [pollFollowUps]);

  // ── 4. Request permission helper ──────────────────────────────────────────
  const askPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
    return result;
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalBadge = unreadCount + followUps.length;

  return {
    notifications,
    followUps,
    unreadCount,
    totalBadge,
    permissionState,
    isLoading,
    askPermission,
    refetchFollowUps: pollFollowUps,
  };
}