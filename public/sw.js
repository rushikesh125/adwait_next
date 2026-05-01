// ── Service Worker for Push Notifications ────────────────────────────────────
// Place this file at: /public/sw.js (Next.js serves /public at root)

const CACHE_NAME = "adwait-notif-v1";

// ── Install & Activate ────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// ── Push Event (server-sent push via Web Push API) ────────────────────────────
self.addEventListener("push", (e) => {
  let data = { title: "Adwait Tours", body: "You have a new notification.", tag: "general", url: "/" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {}

  const options = {
    body: data.body,
    icon: "/adwait-logo.jpg",       // your app icon
    badge: "/badge-icon.png",       // small mono icon shown in Android status bar
    tag: data.tag,                  // group same-type notifications (replaces old ones)
    renotify: true,                 // vibrate/sound even if same tag
    requireInteraction: data.requireInteraction ?? false,
    data: { url: data.url },
    actions: data.actions ?? [],
    vibrate: [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  const targetUrl = e.notification.data?.url ?? "/";

  // Action buttons
  if (e.action === "view") {
    e.waitUntil(openOrFocusWindow(targetUrl));
    return;
  }
  if (e.action === "dismiss") return;

  // Default click
  e.waitUntil(openOrFocusWindow(targetUrl));
});

// ── Notification Close ────────────────────────────────────────────────────────
self.addEventListener("notificationclose", () => {
  // Analytics hook — can post to your backend here
});

// ── Background Sync (retry failed markRead calls) ────────────────────────────
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-read-status") {
    e.waitUntil(syncPendingReads());
  }
});

async function syncPendingReads() {
  // Reads pending IDs from IndexedDB or Cache if needed
  // Placeholder — extend if you track optimistic reads
}

// ── Helper: Focus existing window or open new one ────────────────────────────
async function openOrFocusWindow(url) {
  const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = allClients.find((c) => c.url.includes(self.location.origin));
  if (existing) {
    await existing.focus();
    existing.postMessage({ type: "NAVIGATE", url });
    return;
  }
  return clients.openWindow(url);
}

// ── Message from page (e.g., "show local notification") ──────────────────────
self.addEventListener("message", (e) => {
  if (e.data?.type === "LOCAL_NOTIFICATION") {
    const { title, body, tag, url, actions } = e.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: "/adwait-logo.jpg",
      badge: "/badge-icon.png",
      tag: tag ?? "local",
      renotify: true,
      data: { url: url ?? "/" },
      actions: actions ?? [],
      vibrate: [150, 80, 150],
    });
  }
});