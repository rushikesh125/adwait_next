// app/api/cron/check-cold-leads/route.js
//
// Cron job: Automatically closes leads marked as "cold" after 7 days.
//
// Trigger cadence: Daily (e.g. "0 2 * * *" in vercel.json / cron config)
//
// Flow:
//   1. Load all leads where isCold == true AND status != "Closed Lost"
//   2. For each, check if coldMarkedAt is >= 7 days ago
//   3. If yes — update lead status to "Closed Lost" + reject all quotations
//   4. Write a dedup key so the same lead is never processed twice
//
// Authorization: Bearer ${CRON_SECRET} header (same pattern as check-followups)

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
import { updateLeadStatus, rejectAllQuotationsForLead } from "@/firebase/leadsService";
import { createNotification } from "@/firebase/notificationsService";

const LOG_PREFIX = "[cron/check-cold-leads]";

// 7-day window before auto-close
const COLD_LEAD_CLOSE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// ── Auth ──────────────────────────────────────────────────────────────────────
function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

// ── Dedup helpers (same pattern as check-followups) ───────────────────────────
async function isAlreadyClosed(key) {
  try {
    const snap = await getDoc(doc(db, "coldLeadClosedLog", key));
    return snap.exists();
  } catch {
    // Safe default — if we can't check, skip to avoid double-processing
    return true;
  }
}

async function markClosed(key, metadata = {}) {
  try {
    await setDoc(doc(db, "coldLeadClosedLog", key), {
      closedAt: serverTimestamp(),
      ...metadata,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to write dedup key "${key}":`, err.message);
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────
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

  // ── 1. Load all cold leads that are not yet Closed Lost ───────────────────
  let coldLeads = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "leads"),
        where("isCold", "==", true),
        where("status", "!=", "Closed Lost")
      )
    );
    coldLeads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    summary.leadsScanned = coldLeads.length;
    console.log(`${LOG_PREFIX} Found ${coldLeads.length} cold lead(s) not yet closed.`);
  } catch (err) {
    const msg = `Failed to load cold leads: ${err.message}`;
    console.error(`${LOG_PREFIX} ${msg}`);
    return Response.json(
      { ok: false, summary: { ...summary, errors: [msg] } },
      { status: 500 }
    );
  }

  // ── 2. Process each cold lead ─────────────────────────────────────────────
  for (const lead of coldLeads) {
    const leadId = lead.id;

    // Validate coldMarkedAt exists and is parseable
    const coldMarkedAt = lead.coldMarkedAt
      ? lead.coldMarkedAt?.toDate
        ? lead.coldMarkedAt.toDate()           // Firestore Timestamp
        : new Date(lead.coldMarkedAt)           // ISO string fallback
      : null;

    if (!coldMarkedAt || isNaN(coldMarkedAt.getTime())) {
      summary.errors.push(`Lead ${leadId}: invalid or missing coldMarkedAt — skipped.`);
      console.warn(`${LOG_PREFIX} Lead ${leadId} has no valid coldMarkedAt, skipping.`);
      summary.leadsSkipped++;
      continue;
    }

    const ageMs = now - coldMarkedAt;

    if (ageMs < COLD_LEAD_CLOSE_AFTER_MS) {
      // Not 7 days yet — skip silently
      summary.leadsSkipped++;
      const daysLeft = Math.ceil((COLD_LEAD_CLOSE_AFTER_MS - ageMs) / (24 * 60 * 60 * 1000));
      console.log(`${LOG_PREFIX} Lead ${leadId} (${lead.name}) — ${daysLeft} day(s) remaining before auto-close.`);
      continue;
    }

    summary.leadsEligible++;

    // Dedup key — one close per lead (no date suffix: this is a one-time action)
    const dedupKey = `cold_close_${leadId}`;

    const alreadyClosed = await isAlreadyClosed(dedupKey);
    if (alreadyClosed) {
      summary.leadsSkipped++;
      console.log(`${LOG_PREFIX} Lead ${leadId} already has dedup key — skipping.`);
      continue;
    }

    // ── 3. Close the lead ───────────────────────────────────────────────────
    try {
      // Update lead status to Closed Lost
      await updateLeadStatus(leadId, "Closed Lost");
      console.log(`${LOG_PREFIX} Lead ${leadId} (${lead.name}) → Closed Lost.`);

      // Reject all associated quotations
      await rejectAllQuotationsForLead(leadId);
      console.log(`${LOG_PREFIX} Lead ${leadId} quotations rejected.`);

      // Write dedup record
      await markClosed(dedupKey, {
        leadId,
        leadName: lead.name || "Unknown",
        agentId: lead.agentId || null,
        coldMarkedAt: coldMarkedAt.toISOString(),
        closedByJob: true,
      });

      // Notify the agent if one is assigned
      if (lead.agentId) {
        try {
          await createNotification({
            userId: lead.agentId,
            orgId: lead.orgId || null,
            type: "cold_lead_auto_closed",
            title: `Cold lead auto-closed: ${lead.name || "Unknown lead"}`,
            message: `"${lead.name || "Unknown lead"}" was marked cold 7 days ago and has been automatically moved to Closed Lost.`,
            link: `/agent-panel/leads/${leadId}`,
            priority: "normal",
            metadata: {
              leadId,
              source: "cron/check-cold-leads",
              dedupKey,
            },
          });
        } catch (notifErr) {
          // Non-fatal — log but don't fail the close operation
          console.warn(`${LOG_PREFIX} Notification failed for agent ${lead.agentId}:`, notifErr.message);
        }
      }

      summary.leadsClosed++;
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
