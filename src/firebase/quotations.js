// src/firebase/quotations/quotations.firebase.js

import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { belongsToOrg, orgFilter } from "./orgScope";
import { updateLeadStatus } from "./leadsService";
import { buildQuotationRejectionNote } from "@/lib/quotationRejection";
import { createNotification } from "./notificationsService";

/* ──────────────────────────────────────────────
   QUOTATIONS CRUD
────────────────────────────────────────────── */

/**
 * Fetch quotations for an agent
 */
export async function fetchQuotationsByAgent(agentId, orgId = null) {
  if (!agentId) return [];

  try {
    const ref = collection(db, "saved_packages_by_agents", agentId, "packages");

    const q = query(ref, ...orgFilter(orgId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const total = snapshot.docs.length;

    return snapshot.docs
      .map((docSnap, index) => ({
        id: docSnap.id,
        quoteNumber: total - index,
        ...docSnap.data(),
      }))
      .filter((q) => q.packageName !== null);
  } catch (error) {
    console.error("❌ fetchQuotationsByAgent:", error);
    throw error;
  }
}

export async function getQuotationById(agentId, quotationId, orgId = null) {
  if (!agentId || !quotationId) return null;
  const ref = doc(
    db,
    "saved_packages_by_agents",
    agentId,
    "packages",
    quotationId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() };
  return belongsToOrg(data, orgId) ? data : null;
}
/**
 * Update existing quotation
 */
export async function updateQuotation(
  agentId,
  quotationId,
  data,
  options = {},
) {
  if (!agentId || !quotationId) {
    throw new Error("Missing agentId or quotationId");
  }

  const ref = doc(
    db,
    "saved_packages_by_agents",
    agentId,
    "packages",
    quotationId,
  );

  const snap = await getDoc(ref);
  if (snap.exists()) {
    const quotation = snap.data();
    if (options.orgId && quotation.orgId && quotation.orgId !== options.orgId) {
      throw new Error("Quotation not found");
    }
    const leadId = data.leadId !== undefined ? data.leadId : quotation.leadId;
    const previousStatus = quotation.status || "Draft";

    if (data.status === "Rejected" && previousStatus !== "Rejected" && leadId) {
      const noteText = buildQuotationRejectionNote(
        { id: quotationId, ...quotation, ...data },
        {
          reason: data.rejectionReason,
          comment: data.rejectionComment,
          details: data.rejectionDetails,
        },
      );
      const batch = writeBatch(db);
      const noteRef = doc(collection(db, "leads", leadId, "notes"));
      batch.update(ref, data);
      batch.set(noteRef, {
        text: noteText,
        createdBy: options.agentName || "Agent",
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      // Update the quotation first
      await updateDoc(ref, data);
    }

    // Check if status is being set to Accepted
    if (data.status === "Accepted" && leadId) {
      await updateLeadStatus(leadId, "Closed Won");
    }
    // ── Create quotation status notification ─────────────────────
if (
  ["Accepted", "Rejected"].includes(data.status) &&
  previousStatus !== data.status
) {
  const label =
    quotation.packageName ||
    quotation.customerName ||
    "Quotation";

  await createNotification({
    userId: agentId,
    type:
      data.status === "Accepted"
        ? "quotation_accepted"
        : "quotation_rejected",

    title:
      data.status === "Accepted"
        ? "Quotation Accepted 🎉"
        : "Quotation Rejected",

    message: `"${label}" has been ${
      data.status === "Accepted"
        ? "accepted"
        : "rejected"
    } by the customer.`,

    link: `/agent-panel/my-quotation?quoteId=${quotationId}`,

    priority:
      data.status === "Accepted"
        ? "high"
        : "normal",
  });
}


    // After update, check if status is being set to Sent
    if (data.status === "Sent" && leadId) {
      // Get the lead to find its agent
      const leadRef = doc(db, "leads", leadId);
      const leadSnap = await getDoc(leadRef);

      if (leadSnap.exists()) {
        const leadData = leadSnap.data();
        const leadAgentId = leadData.agentId;

        if (leadAgentId) {
          // Query quotations only from this specific agent
          const packagesRef = collection(
            db,
            "saved_packages_by_agents",
            leadAgentId,
            "packages",
          );
          const q = query(packagesRef, ...orgFilter(options.orgId || quotation.orgId), where("leadId", "==", leadId));
          const packageSnap = await getDocs(q);
          const leadQuotations = packageSnap.docs.map((doc) => ({
            id: doc.id,
            agentId: leadAgentId,
            ...doc.data(),
          }));

          if (leadQuotations.length > 0) {
            // Sort by createdAt descending to find the absolute latest quotation
            const sortedByDate = leadQuotations.sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            );

            const latestQuotationId = sortedByDate[0].id;

            // Check if current quotation is the latest (regardless of status)
            if (latestQuotationId === quotationId) {
              await updateLeadStatus(leadId, "Quotation Sent");
            }
          }
        }
      }
    }
  } else {
    // If quotation doesn't exist yet, just update it normally
    await updateDoc(ref, data);
  }
}

/**
 * Delete quotation
 */
export async function deleteQuotation(agentId, quotationId) {
  if (!agentId || !quotationId) {
    throw new Error("Missing agentId or quotationId");
  }

  await deleteDoc(
    doc(db, "saved_packages_by_agents", agentId, "packages", quotationId),
  );
}

/**
 * Fetch this agent's quotations that have no leadId set yet —
 * candidates an agent can attach to a lead from the lead detail page.
 */
export async function fetchUnlinkedQuotationsByAgent(agentId, orgId = null) {
  if (!agentId) return [];

  try {
    const ref = collection(db, "saved_packages_by_agents", agentId, "packages");
    const snap = await getDocs(query(ref, ...orgFilter(orgId), orderBy("createdAt", "desc")));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((q) => q.packageName !== null)
      .filter((q) => !q.leadId);
  } catch (error) {
    console.error("❌ fetchUnlinkedQuotationsByAgent:", error);
    throw error;
  }
}

/**
 * Attach an existing (unlinked) quotation to a lead.
 * Writes leadId + leadName + customerId/customerMobile/customerEmail
 * onto the quotation document so future queries find it via leadId.
 */
export async function attachQuotationToLead(agentId, quotationId, lead) {
  if (!agentId || !quotationId || !lead?.id) {
    throw new Error("agentId, quotationId, and lead are required");
  }

  const ref = doc(
    db,
    "saved_packages_by_agents",
    agentId,
    "packages",
    quotationId,
  );

  const patch = { leadId: lead.id };
  if (lead.name) patch.leadName = lead.name;
  if (lead.customerId) patch.customerId = lead.customerId;
  if (lead.mobile) patch.customerMobile = lead.mobile;
  if (lead.email) patch.customerEmail = lead.email;

  await updateDoc(ref, patch);
}

/**
 * Save quotation as new (Save As)
 */
export async function saveQuotationAs(agentId, quotationData, orgId = null) {
  if (!agentId) {
    throw new Error("Agent not authenticated");
  }

  const ref = collection(db, "saved_packages_by_agents", agentId, "packages");

  return await addDoc(ref, {
    ...quotationData,
    ...(orgId && !quotationData.orgId ? { orgId } : {}),
    createdAt: new Date(),
  });
}

/* ──────────────────────────────────────────────
   LOOKUPS (READ-ONLY)
────────────────────────────────────────────── */

/**
 * Fetch all hotels
 */
export async function fetchAllHotels() {
  const snapshot = await getDocs(collection(db, "hotels"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch all destinations
 */
export async function fetchAllDestinations() {
  const snapshot = await getDocs(collection(db, "locations"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch transport states
 */
export async function fetchTransportStates() {
  const snapshot = await getDocs(collection(db, "transport"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch transport packages for a state
 */
export async function fetchTransportPackagesByState(stateId) {
  if (!stateId) return [];

  const snapshot = await getDocs(
    collection(db, "transport", stateId, "packages"),
  );

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteVoucherFromQuotation(agentId, quotationId) {
  if (!agentId || !quotationId) {
    throw new Error("Missing agentId or quotationId");
  }

  const ref = doc(
    db,
    "saved_packages_by_agents",
    agentId,
    "packages",
    quotationId,
  );

  await updateDoc(ref, {
    voucherNumber: null,
    isVoucherGenerated: false,
    voucherType: null,
    issueDate: null,
  });
}
/**
 * Fetch activities by state
 */
export async function fetchActivitiesByState(state) {
  if (!state) return [];

  const q = query(collection(db, "activities"), where("state", "==", state));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
