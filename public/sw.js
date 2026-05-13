// public/sw.js  — completely replace with this clean version
self.addEventListener("push", (e) => {
  if (!e.data) return;

  // Handle both DevTools plain text AND real JSON payloads
  let data;
  try {
    data = e.data.json();
  } catch {
    data = {
      title: "Adwait Tours",
      body: e.data.text(),
      type: "general",
      link: "/agent-panel",
      priority: "normal",
    };
  }

  e.waitUntil(
    self.registration.showNotification(data.title ?? "Adwait Tours", {
      body: data.body ?? "You have a new notification.",
      icon: "/adwait-logo.jpg",
      tag: data.type ?? "general",
      renotify: true,
      requireInteraction: data.priority === "high",
      vibrate: [200, 100, 200],
      data: { url: data.link ?? "/agent-panel" },
      actions: [
        { action: "view", title: "View" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
   console.log("Notification data:", e.notification.data);
  e.notification.close();
  
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url ?? "/agent-panel";
  e.waitUntil(openOrFocusWindow(url));
});

async function openOrFocusWindow(url) {
  const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = all.find((c) => c.url.includes(self.location.origin));
  if (existing) { await existing.focus(); existing.postMessage({ type: "NAVIGATE", url }); return; }
  return clients.openWindow(url);
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));