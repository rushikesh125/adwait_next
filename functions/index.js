// functions/index.js
// Firebase Cloud Function — triggers when a new notification is written to Firestore
// and sends a real push to all of the user's devices (phone, laptop, tablet).
//
// Setup:
//   npm install -g firebase-tools
//   firebase init functions   (choose JavaScript, your project)
//   cd functions && npm install firebase-admin firebase-functions
//   firebase deploy --only functions

const functions = require("firebase-functions");
const admin     = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ── Trigger: new document in /notifications ───────────────────────────────────
exports.sendPushOnNotification = functions
  .runWith({ timeoutSeconds: 30, memory: "256MB" })
  .firestore
  .document("notifications/{notifId}")
  .onCreate(async (snap, context) => {
    const notif = snap.data();
    const { userId, title, message, type, link, priority } = notif;

    if (!userId) return null;

    // Get user's FCM tokens from Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return null;

    const tokens = userDoc.data()?.fcmTokens ?? [];
    if (tokens.length === 0) {
      console.log(`[Push] No tokens for user ${userId}`);
      return null;
    }

    // Build the FCM message
    const messagePayload = {
      notification: {
        title: title  ?? "Adwait Tours",
        body:  message ?? "You have a new notification.",
      },
      data: {
        type:     type     ?? "general",
        link:     link     ?? "/agent-panel",
        priority: priority ?? "normal",
        notifId:  context.params.notifId,
      },
      // Android specific
      android: {
        priority: priority === "high" ? "high" : "normal",
        notification: {
          icon:        "ic_notification",   // drawable resource in your Android app
          color:       "#6366F1",
          channelId:   "adwait_notifications",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      // iOS specific  
      apns: {
        payload: {
          aps: {
            sound:           "default",
            badge:            1,
            contentAvailable: true,
          },
        },
      },
      // Web specific
      webpush: {
        notification: {
          icon:              "/adwait-logo.jpg",
          badge:             "/badge-icon.png",
          requireInteraction: priority === "high",
          vibrate:           [200, 100, 200],
          actions: [
            { action: "view",    title: "View"    },
            { action: "dismiss", title: "Dismiss" },
          ],
        },
        fcmOptions: {
          link: link ?? "/agent-panel",
        },
      },
      tokens, // send to ALL devices of this user
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(messagePayload);
      console.log(`[Push] Sent to ${response.successCount}/${tokens.length} devices`);

      // Clean up invalid/expired tokens
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
        console.log(`[Push] Removed ${invalidTokens.length} stale tokens`);
      }
    } catch (err) {
      console.error("[Push] Error sending push:", err);
    }

    return null;
  });