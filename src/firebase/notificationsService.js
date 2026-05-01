// ── notificationsService.js ───────────────────────────────────────────────────
// Handles: Firestore CRUD, real-time subscription, browser push permissions,
//          service worker registration, and local notification dispatch.

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SERVICE WORKER REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
let _swRegistration = null;

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    _swRegistration = reg;

    // Listen for messages from SW (e.g., NAVIGATE)
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "NAVIGATE" && e.data.url) {
        window.location.href = e.data.url;
      }
    });

    console.log("[SW] Registered:", reg.scope);
    return reg;
  } catch (err) {
    console.error("[SW] Registration failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BROWSER NOTIFICATION PERMISSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns: "granted" | "denied" | "default" | "unsupported"
 */
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Requests browser notification permission.
 * Returns the new permission state.
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SHOW LOCAL BROWSER NOTIFICATION (via Service Worker when possible)
//    Falls back to Notification API if SW not available.
// ─────────────────────────────────────────────────────────────────────────────
export async function showBrowserNotification({
  title,
  body,
  tag = "general",
  url = "/",
  actions = [],
  requireInteraction = false,
}) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;

  // Prefer SW (supports actions, vibrate, badge, background)
  if (_swRegistration) {
    try {
      await _swRegistration.showNotification(title, {
        body,
        icon: "/adwait-logo.jpg",
        badge: "/badge-icon.png",
        tag,
        renotify: true,
        requireInteraction,
        data: { url },
        actions,
        vibrate: [200, 100, 200],
      });
      return;
    } catch (err) {
      console.warn("[Notif] SW showNotification failed, falling back:", err);
    }
  }

  // Fallback: plain Notification API
  const n = new Notification(title, {
    body,
    icon: "/adwait-logo.jpg",
    tag,
    renotify: true,
    requireInteraction,
    data: { url },
  });
  n.onclick = () => {
    window.focus();
    if (url) window.location.href = url;
    n.close();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SEND TO SW WHEN PAGE IS VISIBLE (postMessage path)
//    Use this when you want the SW to show the notification bubble
//    even if the page is in the foreground.
// ─────────────────────────────────────────────────────────────────────────────
export function sendNotificationToSW(payload) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "LOCAL_NOTIFICATION",
    payload,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FIRESTORE: CREATE NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export async function createNotification({
  userId,
  type,
  title,
  message,
  link = "/",
  metadata = {},     // extra data: quotationId, leadId, amount, etc.
  priority = "normal", // "normal" | "high" — high = requireInteraction
}) {
  return addDoc(collection(db, "notifications"), {
    userId,
    type,
    title,
    message,
    link,
    metadata,
    priority,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FIRESTORE: REAL-TIME SUBSCRIPTION (with dedup / new-notification detection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribes to notifications and:
 *  - Calls onNew(notification) for each genuinely new unread notification
 *  - Calls onSnapshot(allNotifications) on every change
 *
 * Returns unsubscribe fn.
 */
export function subscribeToNotifications(userId, onList, onNew) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  // Track which IDs we've already seen to detect truly new arrivals
  let seenIds = new Set();
  let initialized = false;

  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onList(all);

    // On first load, just seed seenIds — don't fire onNew
    if (!initialized) {
      seenIds = new Set(all.map((n) => n.id));
      initialized = true;
      return;
    }

    // Find genuinely new unread notifications
    const newOnes = all.filter((n) => !n.read && !seenIds.has(n.id));
    newOnes.forEach((n) => {
      seenIds.add(n.id);
      if (onNew) onNew(n);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. FIRESTORE: MARK READ
// ─────────────────────────────────────────────────────────────────────────────
export async function markNotificationRead(notificationId) {
  return updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsRead(userId) {
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    )
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  return batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. NOTIFICATION SOUND
// ─────────────────────────────────────────────────────────────────────────────
let _audioCtx = null;

/**
 * Plays a soft "ding" using the Web Audio API (no asset needed).
 * Only plays if user has interacted with the page (browser autoplay policy).
 */
export function playNotificationSound() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);        // A5
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3); // A4

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail — audio context may not be available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. VAPID / WEB PUSH SUBSCRIPTION (for future server-push)
//    Use this when you set up a push server (FCM, web-push npm, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribes this browser to Web Push and returns the PushSubscription.
 * You must store this subscription on your server to send pushes later.
 *
 * @param {string} vapidPublicKey - Your VAPID public key (base64url)
 */
export async function subscribeToPush(vapidPublicKey) {
  if (!_swRegistration) throw new Error("Service worker not registered");

  const existing = await _swRegistration.pushManager.getSubscription();
  if (existing) return existing;

  const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await _swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: appServerKey,
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}