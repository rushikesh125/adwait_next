// public/sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyC2KfDY8fuDzKnT-7LbXyPHazf-GgVZd5I",
  authDomain:        "fir-quote-55c9a.firebaseapp.com",
  projectId:         "fir-quote-55c9a",
  storageBucket:     "fir-quote-55c9a.firebasestorage.app",
  messagingSenderId: "330362457923",
  appId:             "1:330362457923:web:63ea73bc5e11580e5ea9f6",
});

const messaging = firebase.messaging();

// ── Background push (app closed / backgrounded) ───────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const data = payload.data ?? {};

  self.registration.showNotification(title ?? "Adwait Tours", {
    body:               body ?? "You have a new notification.",
    icon:               "/adwait-logo.jpg",
    badge:              "/badge-icon.png",
    tag:                data.type ?? "general",
    renotify:           true,
    requireInteraction: data.priority === "high",
    vibrate:            [200, 100, 200],
    data: { url: data.link ?? "/agent-panel" },
    actions: [
      { action: "view",    title: "View"    },
      { action: "dismiss", title: "Dismiss" },
    ],
  });
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url ?? "/agent-panel";
  e.waitUntil(openOrFocusWindow(url));
});

async function openOrFocusWindow(url) {
  const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = all.find((c) => c.url.includes(self.location.origin));
  if (existing) {
    await existing.focus();
    existing.postMessage({ type: "NAVIGATE", url });
    return;
  }
  return clients.openWindow(url);
}

self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));