// app/api/cron/check-cold-leads/route.js
//
// Cron job: Automatically closes leads marked as "cold" after 5 days.
//
// Trigger cadence: Daily (configured in vercel.json).
//
// Flow:
//   1. Load all leads where isCold == true.
//   2. Skip leads already in "Closed Lost".
//   3. If coldMarkedAt is at least 5 days old, move the lead to "Closed Lost".
//   4. Reject all associated quotations.
//   5. Write a dedup key so the same lead is not processed twice.
//
// Authorization: Bearer ${CRON_SECRET} header.

import { admin, adminDb } from "@/firebase/admin";

const LOG_PREFIX = "[cron/check-cold-leads]";
const COLD_LEAD_CLOSE_AFTER_MS = 5 * 24 * 60 * 60 * 1000;

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function isAlreadyClosed(key) {
  try {
    const snap = await adminDb.collection("coldLeadClosedLog").doc(key).get();
    return snap.exists;
  } catch {
    return true;
  }
}

async function markClosed(key, metadata = {}) {
  try {
    await adminDb.collection("coldLeadClosedLog").doc(key).set({
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...metadata,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to write dedup key "${key}":`, err.message);
  }
}

async function closeLeadAsLost(leadId) {
  await adminDb.collection("leads").doc(leadId).update({
    status: "Closed Lost",
    updatedAt: new Date().toISOString(),
    closedLostAt: admin.firestore.FieldValue.serverTimestamp(),
    closedLostReason: "Cold lead auto-close",
  });
}

async function rejectAllQuotationsForLead(leadId) {
  const snapshot = await adminDb
    .collectionGroup("packages")
    .where("leadId", "==", leadId)
    .get();

  if (snapshot.empty) return 0;

  let batch = adminDb.batch();
  let pendingWrites = 0;
  let rejectedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (["Booked", "Confirmed"].includes(data.status)) continue;

    batch.update(docSnap.ref, {
      status: "Rejected",
      rejectionReason: "Lead Closed Lost",
      rejectionDetails: "Lead was auto-closed after remaining cold for 5 days.",
      updatedAt: new Date().toISOString(),
    });
    pendingWrites++;
    rejectedCount++;

    if (pendingWrites === 450) {
      await batch.commit();
      batch = adminDb.batch();
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }

  return rejectedCount;
}

async function notifyAgent(lead, dedupKey) {
  if (!lead.agentId) return;

  await adminDb.collection("notifications").add({
    userId: lead.agentId,
    type: "cold_lead_auto_closed",
    title: `Cold lead auto-closed: ${lead.name || "Unknown lead"}`,
    message: `"${lead.name || "Unknown lead"}" was marked cold 5 days ago and has been automatically moved to Closed Lost.`,
    link: `/agent-panel/leads/${lead.id}`,
    priority: "normal",
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      leadId: lead.id,
      source: "cron/check-cold-leads",
      dedupKey,
    },
  });
}

export async function GET(request) {
  const runStart = Date.now();

  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary = {
    leadsScanned: 0,
    leadsEligible: 0,
    leadsClosed: 0,
    leadsSkipped: 0,
    leadsFailed: 0,
    errors: [],
  };

  let coldLeads = [];
  try {
    const snap = await adminDb.collection("leads").where("isCold", "==", true).get();
    coldLeads = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((lead) => lead.status !== "Closed Lost");
    summary.leadsScanned = coldLeads.length;
    console.log(`${LOG_PREFIX} Found ${coldLeads.length} cold lead(s) not yet closed.`);
  } catch (err) {
    const msg = `Failed to load cold leads: ${err.message}`;
    console.error(`${LOG_PREFIX} ${msg}`);
    return Response.json(
      { ok: false, summary: { ...summary, errors: [msg] } },
      { status: 500 },
    );
  }

  for (const lead of coldLeads) {
    const leadId = lead.id;
    const coldMarkedAt = toDate(lead.coldMarkedAt);

    if (!coldMarkedAt) {
      summary.errors.push(`Lead ${leadId}: invalid or missing coldMarkedAt - skipped.`);
      console.warn(`${LOG_PREFIX} Lead ${leadId} has no valid coldMarkedAt, skipping.`);
      summary.leadsSkipped++;
      continue;
    }

    const ageMs = now - coldMarkedAt;

    if (ageMs < COLD_LEAD_CLOSE_AFTER_MS) {
      summary.leadsSkipped++;
      const daysLeft = Math.ceil(
        (COLD_LEAD_CLOSE_AFTER_MS - ageMs) / (24 * 60 * 60 * 1000),
      );
      console.log(
        `${LOG_PREFIX} Lead ${leadId} (${lead.name || "Unknown"}) - ${daysLeft} day(s) remaining before auto-close.`,
      );
      continue;
    }

    summary.leadsEligible++;

    const dedupKey = `cold_close_${leadId}`;
    const alreadyClosed = await isAlreadyClosed(dedupKey);
    if (alreadyClosed) {
      summary.leadsSkipped++;
      console.log(`${LOG_PREFIX} Lead ${leadId} already has dedup key - skipping.`);
      continue;
    }

    try {
      await closeLeadAsLost(leadId);
      const rejectedCount = await rejectAllQuotationsForLead(leadId);

      await markClosed(dedupKey, {
        leadId,
        leadName: lead.name || "Unknown",
        agentId: lead.agentId || null,
        coldMarkedAt: coldMarkedAt.toISOString(),
        rejectedQuotationCount: rejectedCount,
        closedByJob: true,
      });

      try {
        await notifyAgent(lead, dedupKey);
      } catch (notifErr) {
        console.warn(
          `${LOG_PREFIX} Notification failed for agent ${lead.agentId}:`,
          notifErr.message,
        );
      }

      summary.leadsClosed++;
      console.log(
        `${LOG_PREFIX} Lead ${leadId} (${lead.name || "Unknown"}) closed; quotations rejected: ${rejectedCount}.`,
      );
    } catch (err) {
      summary.leadsFailed++;
      const msg = `Failed to close lead ${leadId} (${lead.name || "?"}): ${err.message}`;
      summary.errors.push(msg);
      console.error(`${LOG_PREFIX} ${msg}`);
    }
  }

  const elapsed = Date.now() - runStart;
  const ok = summary.leadsFailed === 0 && summary.errors.length === 0;

  console.log(`${LOG_PREFIX} Done in ${elapsed}ms |`, JSON.stringify(summary));

  return Response.json({
    ok,
    elapsed: `${elapsed}ms`,
    summary,
  });
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
