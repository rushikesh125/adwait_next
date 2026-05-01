// src/app/api/send-push/route.js
//
// This replaces the Firebase Cloud Function entirely.
// Vercel runs this for free — no Blaze plan needed.
//
// HOW IT WORKS:
// When a notification is created in Firestore, your frontend calls this
// API route, which then sends the FCM push to the user's devices.
//
// SETUP:
// Add these to your Vercel environment variables (or .env.local for testing):
//   PUSH_SECRET=any_random_string_you_make_up   (e.g. "adwait-push-secret-2024")
//   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  (see below)

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging }                  from "firebase-admin/messaging";
import { getFirestore }                  from "firebase-admin/firestore";

// ── Init Firebase Admin (once) ────────────────────────────────────────────────
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  return initializeApp({ credential: cert(serviceAccount) });
}

// ── POST /api/send-push ───────────────────────────────────────────────────────
export async function POST(request) {
  try {
    // Simple secret check so random people can't spam your endpoint
    const secret = request.headers.get("x-push-secret");
    if (secret !== process.env.PUSH_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, title, message, type, link, priority } = await request.json();
    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

    const app = getAdminApp();
    const db  = getFirestore(app);

    // Get user's FCM tokens
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return Response.json({ error: "User not found" }, { status: 404 });

    const tokens = userDoc.data()?.fcmTokens ?? [];
    if (tokens.length === 0) {
      return Response.json({ message: "No tokens registered" }, { status: 200 });
    }

    // Send FCM push to all devices
    const messaging = getMessaging(app);
    const response  = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: title ?? "Adwait Tours", body: message ?? "New notification" },
      data: {
        type:     type     ?? "general",
        link:     link     ?? "/agent-panel",
        priority: priority ?? "normal",
      },
      webpush: {
        notification: {
          icon:               "/adwait-logo.jpg",
          badge:              "/badge-icon.png",
          requireInteraction: priority === "high",
          vibrate:            [200, 100, 200],
          actions: [
            { action: "view",    title: "View"    },
            { action: "dismiss", title: "Dismiss" },
          ],
        },
        fcmOptions: { link: link ?? "/agent-panel" },
      },
      android: { priority: priority === "high" ? "high" : "normal" },
    });

    // Clean up dead tokens
    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(tokens[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      const cleaned = tokens.filter((t) => !invalidTokens.includes(t));
      await db.collection("users").doc(userId).update({ fcmTokens: cleaned });
    }

    return Response.json({
      success:      true,
      sent:         response.successCount,
      failed:       response.failureCount,
      totalDevices: tokens.length,
    });

  } catch (err) {
    console.error("[send-push] Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}