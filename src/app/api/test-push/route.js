import webpush from "web-push";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { orgFilter } from "@/firebase/orgScope";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const orgId = searchParams.get("orgId");

  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  const snap = await getDocs(
    query(collection(db, "pushSubscriptions"), where("userId", "==", userId), ...orgFilter(orgId))
  );

  if (snap.empty) return Response.json({ error: "No subscription found for this user" }, { status: 404 });

  const payload = JSON.stringify({
    title: "Test Notification",
    body: "If you see this, push is working!",
    type: "test",
    link: "/agent-panel",
    priority: "normal",
  });

  const results = await Promise.allSettled(
    snap.docs.map((d) => webpush.sendNotification(d.data().subscription, payload))
  );

  return Response.json({ results: results.map(r => r.status) });
}
