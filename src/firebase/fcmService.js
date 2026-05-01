// src/firebase/fcmService.js
// Handles FCM token registration + saving to Firestore
// Import this once in your app root or AgentPanelLayout

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db, app } from "./config"; // make sure you export `app` from config
import { showBrowserNotification, playNotificationSound } from "./notificationsService";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let _messaging = null;

function getMessagingInstance() {
  if (!_messaging && typeof window !== "undefined") {
    _messaging = getMessaging(app);
  }
  return _messaging;
}

// ── Register device and save FCM token to Firestore ──────────────────────────
/**
 * Call this once after the user logs in and grants notification permission.
 * Saves their device token under: users/{userId}/fcmTokens
 * Multiple devices (phone + laptop) are all stored — all get notified.
 */
export async function registerFCMToken(userId) {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (!token) {
      console.warn("[FCM] No token received — check VAPID key");
      return null;
    }

    // Save token to Firestore (arrayUnion = no duplicates, supports multi-device)
    await setDoc(
      doc(db, "users", userId),
      {
        fcmTokens:   arrayUnion(token),
        lastSeen:    serverTimestamp(),
        platform:    getPlatformInfo(),
      },
      { merge: true }
    );

    console.log("[FCM] Token registered:", token.slice(0, 20) + "...");
    return token;
  } catch (err) {
    console.error("[FCM] Token registration failed:", err);
    return null;
  }
}

// ── Listen for foreground messages (app is open) ─────────────────────────────
/**
 * When the app is OPEN, FCM doesn't show a notification automatically.
 * This listener handles that case — shows our in-app notification + sound.
 */
export function listenForForegroundMessages() {
  if (typeof window === "undefined") return () => {};

  const messaging = getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message:", payload);

    const { title, body } = payload.notification ?? {};
    const data = payload.data ?? {};

    // Play sound
    playNotificationSound();

    // Show browser notification even in foreground (optional — remove if you
    // prefer to only show your in-app dropdown)
    if (document.visibilityState === "hidden" || !document.hasFocus()) {
      showBrowserNotification({
        title:              title ?? "Adwait Tours",
        body:               body  ?? "New notification",
        tag:                data.type  ?? "general",
        url:                data.link  ?? "/agent-panel",
        requireInteraction: data.priority === "high",
      });
    }
  });

  return unsubscribe;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPlatformInfo() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua))             return "android";
  if (/iphone|ipad|ipod/i.test(ua))    return "ios";
  if (/windows/i.test(ua))             return "windows";
  if (/mac/i.test(ua))                 return "mac";
  return "web";
}