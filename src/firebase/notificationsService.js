// src/firebase/notificationsService.js

import {
  addDoc, collection, doc, getDocs, limit,
  onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, where, writeBatch,
} from "firebase/firestore";
import { db } from "./config";

let _swRegistration = null;

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
   // Change this line in registerServiceWorker()
const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    _swRegistration = reg;
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "NAVIGATE" && e.data.url) window.location.href = e.data.url;
    });
    return reg;
  } catch (err) {
    console.error("[SW] Registration failed:", err);
    return null;
  }
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export async function showBrowserNotification({ title, body, tag = "general", url = "/", actions = [], requireInteraction = false }) {
  if (typeof window === "undefined" || Notification.permission !== "granted") return;
  if (_swRegistration) {
    try {
      await _swRegistration.showNotification(title, {
        body, icon: "/adwait-logo.jpg", badge: "/badge-icon.png",
        tag, renotify: true, requireInteraction,
        data: { url }, actions, vibrate: [200, 100, 200],
      });
      return;
    } catch {}
  }
  const n = new Notification(title, { body, icon: "/adwait-logo.jpg", tag, data: { url } });
  n.onclick = () => { window.focus(); if (url) window.location.href = url; n.close(); };
}

let _audioCtx = null;
export function playNotificationSound() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Creates Firestore notification AND triggers push to phone
export async function createNotification({ userId, type, title, message, link = "/", metadata = {}, priority = "normal" }) {
  const docRef = await addDoc(collection(db, "notifications"), {
    userId, type, title, message, link, metadata, priority,
    read: false, createdAt: serverTimestamp(),
  });

  // Fire and forget — sends push via your Next.js API route
  triggerPush({ userId, title, message, type, link, priority });

  return docRef;
}

function triggerPush({ userId, title, message, type, link, priority }) {
  if (typeof window === "undefined") return;
  fetch("/api/send-push", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "x-push-secret": process.env.NEXT_PUBLIC_PUSH_SECRET ?? "",
    },
    body: JSON.stringify({ userId, title, message, type, link, priority }),
  }).catch((err) => console.warn("[Push] Failed:", err));
}

export function subscribeToNotifications(userId, onList, onNew) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  let seenIds = new Set();
  let initialized = false;
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onList(all);
    if (!initialized) { seenIds = new Set(all.map((n) => n.id)); initialized = true; return; }
    const newOnes = all.filter((n) => !n.read && !seenIds.has(n.id));
    newOnes.forEach((n) => { seenIds.add(n.id); if (onNew) onNew(n); });
  });
}

export async function markNotificationRead(notificationId) {
  return updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsRead(userId) {
  const snap = await getDocs(query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  ));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  return batch.commit();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(vapidPublicKey) {
  if (!_swRegistration) throw new Error("Service worker not registered");
  const existing = await _swRegistration.pushManager.getSubscription();
  if (existing) return existing;
  return _swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}