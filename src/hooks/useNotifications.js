// ── hooks/useNotifications.js ─────────────────────────────────────────────────
// Single hook that manages:
//   - Firestore notification subscription
//   - Browser notification permission + display
//   - New notification sound
//   - SW registration (once per app)

import { useCallback, useEffect, useState } from "react";
import { db } from "@/firebase/config";
import {
  subscribeToNotifications,
  showBrowserNotification,
  playNotificationSound,
  requestNotificationPermission,
  registerServiceWorker,
} from "@/firebase/notificationsService";
import { useInstallmentAlerts } from "./useInstallmentAlerts";

export function useNotifications(userId) {
  useInstallmentAlerts(userId);
  const [notifications, setNotifications] = useState([]);
  const [permissionState, setPermissionState] = useState("default");
  const [isLoading, setIsLoading] = useState(true);

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
      (all) => {
        setNotifications(all);
        setIsLoading(false);
      },
      (newNotif) => {
        playNotificationSound();
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

  // ── 3. Request permission helper ──────────────────────────────────────────
  const askPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
    return result;
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;
  const followUps = notifications.filter(
    (n) => n.type === "follow_up_reminder" && !n.read
  );
  const totalBadge = unreadCount;

  return {
    notifications,
    followUps,
    unreadCount,
    totalBadge,
    permissionState,
    isLoading,
    askPermission,
    refetchFollowUps: () => {},
  };
}