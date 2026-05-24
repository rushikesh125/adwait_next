// app/api/send-push/route.js
import webpush from "web-push";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where,writeBatch  } from "firebase/firestore";
import { orgFilter } from "@/firebase/orgScope";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export async function POST(req) {
  try {
    const { userId, orgId, title, message, type, link, priority } = await req.json();

    // Fetch all push subscriptions for this user from Firestore
    const snap = await getDocs(
      query(collection(db, "pushSubscriptions"), where("userId", "==", userId), ...orgFilter(orgId)),
    );

    if (snap.empty) {
      return Response.json({ ok: true, sent: 0 });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      type,
      link,
      priority,
    });

    const results = await Promise.allSettled(
      snap.docs.map((d) =>
        webpush.sendNotification(d.data().subscription, payload),
      ),
    );
    // Auto-delete stale/expired subscriptions
    const batch = writeBatch(db);
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        batch.delete(snap.docs[i].ref);
      }
    });
    await batch.commit();
    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.log("PUSH API CALLED", {
  userId,
  orgId,
  title,
  type,
});
    return Response.json({ ok: true, sent });

  } catch (err) {
    console.error("[send-push]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
