// hooks/useNotifications.js
import { useCallback, useEffect, useState } from "react";
import {
  subscribeToNotifications,
  showBrowserNotification,
  playNotificationSound,
  requestNotificationPermission,
  registerServiceWorker,
} from "@/firebase/notificationsService";
import { useInstallmentAlerts } from "./useInstallmentAlerts";
import { useTodayFollowUps } from "./useTodayFollowUps"; // ← NEW

export function useNotifications(userId) {
  useInstallmentAlerts(userId);

  // ── NEW: live 2hr-window follow-ups from subcollection ───────────────────
  const { followUps: dueSoonFollowUps, isLoading: fuLoading } =
    useTodayFollowUps(userId);

  const [notifications, setNotifications] = useState([]);
  const [permissionState, setPermissionState] = useState("default");
  const [isLoading, setIsLoading] = useState(true);

  // ── 1. Register SW once — UNCHANGED ──────────────────────────────────────
  useEffect(() => {
    registerServiceWorker();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  // ── 2. Subscribe to Firestore notifications — UNCHANGED ──────────────────
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToNotifications(
      userId,
      (all) => {
        setNotifications(all);
        setIsLoading(false);
      },
      (newNotif) => {
  playNotificationSound();

  // ONLY show in-app/browser notification
  // when push notifications are NOT enabled

  if (Notification.permission === "granted") {
    if (
      document.visibilityState === "hidden" ||
      !document.hasFocus()
    ) {
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
}
    );

    return unsub;
  }, [userId]);

  useEffect(() => {
  if (
    typeof window === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  dueSoonFollowUps.forEach((fu) => {
    // prevent duplicate browser notifications
    const key = `fu_browser_${fu.id}`;

    if (sessionStorage.getItem(key)) return;

    const overdue =
      new Date(fu.dateTime) < new Date();

    showBrowserNotification({
      title: overdue
        ? "⚠️ Follow-up Overdue"
        : "📞 Follow-up Due Soon",

      body: `${fu.leadName} • ${fu.mode} follow-up`,

      tag: `followup-${fu.id}`,

      url: `/agent-panel/leads/${fu.leadId}`,

      requireInteraction: overdue,
    });

    sessionStorage.setItem(key, "1");
  });
}, [dueSoonFollowUps]);

  // ── 3. Request permission helper — UNCHANGED ─────────────────────────────
  const askPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
    return result;
  }, []);

  // ── Derived — UNCHANGED except totalBadge ────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Existing: follow_up_reminder Firestore notifications (unread)
  const followUps = notifications.filter(
    (n) => n.type === "follow_up_reminder" && !n.read
  );

  // Badge now includes both unread notifications AND due-soon follow-ups
  const totalBadge = unreadCount + dueSoonFollowUps.length; // ← ONLY CHANGE

  return {
    notifications,
    setNotifications,
    followUps,           // unchanged — existing Follow-up Reminders section
    dueSoonFollowUps,    // ← NEW
    unreadCount,
    totalBadge,
    permissionState,
    isLoading: isLoading || fuLoading,
    askPermission,
    refetchFollowUps: () => {},
  };
}