import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { createNotification } from "@/firebase/notificationsService";

const LOG_PREFIX = "[cron/check-followups]";

// How far ahead to warn (2 hours)
const SOON_MS = 2 * 60 * 60 * 1000;
// How far back to still notify for overdue (2 days max)
const OVERDUE_LIMIT_MS = 2 * 24 * 60 * 60 * 1000;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function isAlreadySent(key) {
  try {
    const snap = await getDoc(doc(db, "followupNotifSent", key));
    return snap.exists();
  } catch {
    return true; // safe default — avoid spam on error
  }
}

async function markSent(key, metadata = {}) {
  try {
    await setDoc(doc(db, "followupNotifSent", key), {
      sentAt: serverTimestamp(),
      ...metadata,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to write dedup key "${key}":`, err.message);
  }
}

export async function GET(request) {
  const runStart = Date.now();

  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary = {
    leadsScanned: 0,
    followupsChecked: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    notificationsFailed: 0,
    errors: [],
  };

  // Load all leads that have an agentId
  let leads = [];
  try {
    const snap = await getDocs(
      query(collection(db, "leads"), where("agentId", "!=", null))
    );
    leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    summary.leadsScanned = leads.length;
  } catch (err) {
    return Response.json(
      { ok: false, summary: { ...summary, errors: [`Failed to load leads: ${err.message}`] } },
      { status: 500 }
    );
  }

  for (const lead of leads) {
    const agentId = lead.agentId;
    if (!agentId) continue;

    let followups = [];
    try {
      const fuSnap = await getDocs(
        collection(db, "leads", lead.id, "followups")
      );
      followups = fuSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      summary.errors.push(`Lead ${lead.id}: failed to fetch followups — ${err.message}`);
      continue;
    }

    for (const fu of followups) {
      // Skip completed ones
      if (fu.status === "Completed") continue;

      summary.followupsChecked++;

      const dt = fu.dateTime?.toDate
        ? fu.dateTime.toDate()
        : fu.dateTime
        ? new Date(fu.dateTime)
        : null;

      if (!dt) continue;

      const diffMs = dt - now; // negative = overdue
      const isOverdue = diffMs < 0;
      const isSoon = diffMs > 0 && diffMs <= SOON_MS;

      // Skip if too far in the future or too far overdue
      if (!isOverdue && !isSoon) continue;
      if (isOverdue && Math.abs(diffMs) > OVERDUE_LIMIT_MS) continue;

      // Build dedup key — one notification per follow-up per trigger type per day
      const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const triggerType = isOverdue ? "overdue" : "soon";
      const dedupKey = `${lead.id}_${fu.id}_${triggerType}_${dateStr}`;

      const alreadySent = await isAlreadySent(dedupKey);
      if (alreadySent) {
        summary.notificationsSkipped++;
        continue;
      }

      // Build notification content
      const leadName = lead.name || "Unknown lead";
      const mode = fu.mode || "Follow-up";
      const timeStr = dt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const title = isOverdue
        ? `⏰ Overdue: ${mode} with ${leadName}`
        : `Reminder: ${mode} with ${leadName} due soon`;

      const message = isOverdue
        ? `${mode} follow-up with ${leadName} was due at ${timeStr} and is still pending.`
        : `You have a ${mode} follow-up with ${leadName} due at ${timeStr}.`;

      try {
        await createNotification({
          userId: agentId,
          type: "follow_up_reminder",
          title,
          message,
          link: `/agent-panel/leads/${lead.id}`,
          priority: isOverdue ? "high" : "normal",
          metadata: {
            leadId: lead.id,
            followupId: fu.id,
            triggerType,
            dedupKey,
            source: "cron/check-followups",
          },
        });

        await markSent(dedupKey, {
          agentId,
          leadId: lead.id,
          followupId: fu.id,
          triggerType,
        });

        summary.notificationsSent++;
      } catch (err) {
        summary.notificationsFailed++;
        summary.errors.push(
          `Failed to notify agent ${agentId} for followup ${fu.id}: ${err.message}`
        );
      }
    }
  }

  const elapsed = Date.now() - runStart;
  console.log(`${LOG_PREFIX} Done in ${elapsed}ms |`, JSON.stringify(summary));

  return Response.json({
    ok: summary.notificationsFailed === 0 && summary.errors.length === 0,
    elapsed: `${elapsed}ms`,
    summary,
  });
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}