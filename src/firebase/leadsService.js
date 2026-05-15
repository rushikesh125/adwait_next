import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  collectionGroup,
} from "firebase/firestore";

const leadsRef = collection(db, "leads");

// ─────────────────────────────────────────────────────────────────────────────
// CREATE LEAD
// ─────────────────────────────────────────────────────────────────────────────

export const addLead = async (data) => {
  const ref = await addDoc(leadsRef, {
    ...data,
    createdAt: serverTimestamp(),
    status: "New",
  });

  return ref.id;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET LEADS
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLeads = async () => {
  const q = query(leadsRef, orderBy("createdAt", "desc"));

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getLeadsByAgent = async (agentId) => {
  const q = query(
    leadsRef,
    where("agentId", "==", agentId)
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort(
      (a, b) =>
        (b.createdAt?.seconds || 0) -
        (a.createdAt?.seconds || 0)
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ASSIGNED LEAD
// ─────────────────────────────────────────────────────────────────────────────

export const createAssignedLead = async ({
  agentId,
  customerId,
  agentName,
  adminId,
  ...data
}) => {
  const docRef = await addDoc(leadsRef, {
    ...data,
    agentId: agentId || null,
    assignedAgentId: agentId || null,
    assignedAgentName: agentName || "",
    customerId: customerId || null,
    adminId: adminId || null,
    createdAt: serverTimestamp(),
    status: "New",
    source: data.source || "Enquiry Form",
  });

  return docRef.id;
};

// ─────────────────────────────────────────────────────────────────────────────
// QUOTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getQuotationsForLead = async (leadId) => {
  if (!leadId) return [];

  try {
    const byLeadIdQ = query(
      collectionGroup(db, "packages"),
      where("leadId", "==", leadId)
    );
    const byLeadIdSnap = await getDocs(byLeadIdQ);
    const byId = new Map(
      byLeadIdSnap.docs.map((d) => [d.ref.path, { id: d.id, ...d.data() }])
    );

    const leadSnap = await getDoc(doc(db, "leads", leadId));
    const lead = leadSnap.exists() ? leadSnap.data() : null;
    const mobile = lead?.mobile;
    const email = lead?.email;

    const fallbackQueries = [];
    if (mobile) {
      fallbackQueries.push(
        query(collectionGroup(db, "packages"), where("customerMobile", "==", mobile))
      );
      fallbackQueries.push(
        query(collectionGroup(db, "packages"), where("mobile", "==", mobile))
      );
    }
    if (email) {
      fallbackQueries.push(
        query(collectionGroup(db, "packages"), where("customerEmail", "==", email))
      );
      fallbackQueries.push(
        query(collectionGroup(db, "packages"), where("email", "==", email))
      );
    }

    await Promise.all(
      fallbackQueries.map(async (q) => {
        try {
          const snap = await getDocs(q);
          snap.docs.forEach((d) => {
            const data = d.data();
            if (data.leadId && data.leadId !== leadId) return;
            byId.set(d.ref.path, { id: d.id, ...data });
          });
        } catch (e) {
          // A fallback may fail if the field doesn't exist — non-fatal.
        }
      })
    );

    return Array.from(byId.values());
  } catch (error) {
    console.error("Error fetching quotations for lead:", error);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE LEAD STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const updateLeadStatus = async (
  leadId,
  newStatus
) => {
  if (!leadId) return;

  try {
    const leadRef = doc(db, "leads", leadId);

    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) return;

    const currentStatus =
      leadSnap.data().status;

    // Avoid unnecessary updates
    if (currentStatus === newStatus) return;

    const reviveStatuses = [
      "New",
      "Contacted",
      "Quotation Sent",
      "Closed Won",
    ];

    const removingColdState =
      reviveStatuses.includes(newStatus);

    const payload = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // If lead becomes active again,
    // remove cold lead state
    if (removingColdState) {
      payload.isCold = false;
      payload.coldMarkedAt = null;
      payload.coldReason = null;
    }

    await updateDoc(leadRef, payload);

  } catch (error) {
    console.error(
      "Error updating lead status:",
      error
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MARK LEAD AS COLD
// ─────────────────────────────────────────────────────────────────────────────

export const markLeadAsCold = async (
  leadId,
  reason = ""
) => {
  if (!leadId) {
    throw new Error(
      "[markLeadAsCold] leadId is required"
    );
  }

  try {
    const leadRef = doc(db, "leads", leadId);

    await updateDoc(leadRef, {
      isCold: true,
      status: "Cold Lead",
      coldMarkedAt: serverTimestamp(),
      coldReason:
        reason.trim() ||
        "Marked cold during follow-up completion",
      updatedAt: new Date().toISOString(),
    });

    console.log(
      `[leadsService] Lead ${leadId} marked as cold`
    );

  } catch (err) {
    console.error(
      `[leadsService] markLeadAsCold failed for ${leadId}:`,
      err.message
    );

    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE LEAD DETAILS
// ─────────────────────────────────────────────────────────────────────────────

export const updateLeadDetails = async (
  id,
  data
) => {
  const ref = doc(db, "leads", id);

  await updateDoc(ref, data);
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE PAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getLeadById = async (id) => {
  const ref = doc(db, "leads", id);

  const snap = await getDoc(ref);

  return snap.exists()
    ? {
        id: snap.id,
        ...snap.data(),
      }
    : null;
};

export const getLeadNotes = async (lid) => {
  const notesRef = collection(
    db,
    "leads",
    lid,
    "notes"
  );

  const q = query(
    notesRef,
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const addLeadNote = async (
  lid,
  text,
  agentName
) => {
  const notesRef = collection(
    db,
    "leads",
    lid,
    "notes"
  );

  return await addDoc(notesRef, {
    text,
    createdBy: agentName,
    createdAt: serverTimestamp(),
  });
};

export const deleteLeadNote = async (
  lid,
  noteId
) => {
  await deleteDoc(
    doc(db, "leads", lid, "notes", noteId)
  );
};

export const updateLeadNote = async (
  lid,
  noteId,
  text
) => {
  await updateDoc(
    doc(db, "leads", lid, "notes", noteId),
    { text }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENT QUOTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getAgentQuotationsForLead = async (
  uid,
  lid
) => {
  const q = query(
    collection(
      db,
      "saved_packages_by_agents",
      uid,
      "packages"
    ),
    where("leadId", "==", lid)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE LEAD
// ─────────────────────────────────────────────────────────────────────────────

export const deleteLead = async (id) => {
  await deleteDoc(doc(db, "leads", id));
};

// ─────────────────────────────────────────────────────────────────────────────
// CLONE LEAD
// ─────────────────────────────────────────────────────────────────────────────

export const cloneLead = async (id) => {
  const ref = doc(db, "leads", id);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Lead not found");
  }

  const {
    createdAt: _c,
    updatedAt: _u,
    ...data
  } = snap.data();

  return await addDoc(leadsRef, {
    ...data,
    name: `Copy of ${data.name}`,
    status: "New",
    createdAt: serverTimestamp(),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE QUOTATION
// ─────────────────────────────────────────────────────────────────────────────

export const deleteQuotation = async (
  quotationId
) => {
  if (!quotationId) {
    throw new Error(
      "Quotation ID is required"
    );
  }

  await deleteDoc(
    doc(db, "quotations", quotationId)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REJECT ALL QUOTATIONS FOR LEAD
// ─────────────────────────────────────────────────────────────────────────────

export const rejectAllQuotationsForLead =
  async (leadId) => {
    try {
      const q = query(
        collectionGroup(db, "packages"),
        where("leadId", "==", leadId)
      );

      const snapshot = await getDocs(q);

      const updates = snapshot.docs.map(
        (docSnap) => {
          const data = docSnap.data();

          // Skip important statuses
          if (
            ["Booked", "Confirmed"].includes(
              data.status
            )
          ) {
            return Promise.resolve();
          }

          return updateDoc(docSnap.ref, {
            status: "Rejected",
            rejectionReason:
              "Lead Closed Lost",
            updatedAt:
              new Date().toISOString(),
          });
        }
      );

      await Promise.allSettled(updates);

    } catch (error) {
      console.error(
        "Error rejecting quotations:",
        error
      );

      throw error;
    }
  };

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE LEAD STATUS FROM QUOTATION
// ─────────────────────────────────────────────────────────────────────────────

export const updateLeadStatusFromQuotation =
  async (leadId) => {
    if (!leadId) return;

    try {
      const leadRef = doc(db, "leads", leadId);

      const leadSnap = await getDoc(leadRef);

      if (!leadSnap.exists()) return;

      const currentStatus =
        leadSnap.data().status;

      if (
        currentStatus === "Quotation Sent"
      ) {
        return;
      }

      await updateDoc(leadRef, {
        status: "Quotation Sent",
        updatedAt:
          new Date().toISOString(),
      });

    } catch (error) {
      console.error(
        "Error updating lead from quotation:",
        error
      );
    }
  };