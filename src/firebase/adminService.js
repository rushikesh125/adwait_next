import { db } from "./config";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { belongsToOrg, orgFilter } from "./orgScope";

// ── Admin ID backfill (run once when Firestore doc ID ≠ Firebase Auth UID) ───

export const backfillAdminReferences = async (oldAdminId, newUid) => {
  if (!oldAdminId || !newUid || oldAdminId === newUid) return;
  const [agentsSnap, leadsSnap, bookingsSnap] = await Promise.all([
    getDocs(query(collection(db, "agents"), where("adminId", "==", oldAdminId))),
    getDocs(query(collection(db, "leads"), where("adminId", "==", oldAdminId))),
    getDocs(query(collection(db, "bookings"), where("adminId", "==", oldAdminId))),
  ]);
  const updates = [];
  agentsSnap.forEach((d) => updates.push(updateDoc(d.ref, { adminId: newUid })));
  leadsSnap.forEach((d) => updates.push(updateDoc(d.ref, { adminId: newUid })));
  bookingsSnap.forEach((d) => updates.push(updateDoc(d.ref, { adminId: newUid })));
  if (updates.length) await Promise.all(updates);
};

// ── Agent management ──────────────────────────────────────────────────────────

export const getAgentsByAdmin = async (adminId, orgId = null) => {
  if (!adminId) return [];
  const snap = await getDocs(
    query(collection(db, "agents"), ...orgFilter(orgId), where("adminId", "==", adminId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const assignAgentToAdmin = async (agentId, adminId) => {
  const value = adminId || null;
  // Update the agent document
  await updateDoc(doc(db, "agents", agentId), { adminId: value });

  // Backfill existing leads and bookings for this agent
  const [leadsSnap, bookingsSnap] = await Promise.all([
    getDocs(query(collection(db, "leads"), where("agentId", "==", agentId))),
    getDocs(query(collection(db, "bookings"), where("agentId", "==", agentId))),
  ]);

  const updates = [];
  leadsSnap.forEach((d) => updates.push(updateDoc(d.ref, { adminId: value })));
  bookingsSnap.forEach((d) => updates.push(updateDoc(d.ref, { adminId: value })));
  if (updates.length) await Promise.all(updates);
};

// ── Lead queries ──────────────────────────────────────────────────────────────

export const getLeadsByAdmin = async (adminId, orgId = null) => {
  if (!adminId) return [];
  const snap = await getDocs(
    query(collection(db, "leads"), ...orgFilter(orgId), where("adminId", "==", adminId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const getUnassignedLeadsByAdmin = async (adminId, orgId = null) => {
  if (!adminId) return [];
  const snap = await getDocs(
    query(
      collection(db, "leads"),
      ...orgFilter(orgId),
      where("adminId", "==", adminId),
      where("agentId", "==", null)
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const assignLeadToAgent = async (leadId, agent, orgId = null) => {
  if (orgId) {
    const leadSnap = await getDoc(doc(db, "leads", leadId));
    if (!leadSnap.exists() || !belongsToOrg(leadSnap.data(), orgId)) {
      throw new Error("Lead not found");
    }
    if (agent.orgId !== orgId) {
      throw new Error("Agent is not in this organization");
    }
  }
  await updateDoc(doc(db, "leads", leadId), {
    agentId: agent.id,
    assignedAgentId: agent.id,
    assignedAgentName: agent.name || "",
    assignedAt: serverTimestamp(),
  });
};

// ── Booking queries ───────────────────────────────────────────────────────────

export const getBookingsByAdmin = async (adminId, orgId = null) => {
  if (!adminId) return [];
  const snap = await getDocs(
    query(collection(db, "bookings"), ...orgFilter(orgId), where("adminId", "==", adminId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// ── Quotation fan-out (subcollection per agent) ───────────────────────────────

export const getQuotationsByAdmin = async (agentIds, orgId = null) => {
  if (!agentIds?.length) return [];
  const results = await Promise.all(
    agentIds.map((uid) =>
      getDocs(query(collection(db, "saved_packages_by_agents", uid, "packages"), ...orgFilter(orgId))).then(
        (snap) => snap.docs.map((d) => ({ id: d.id, agentId: uid, ...d.data() }))
      )
    )
  );
  return results
    .flat()
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// ── Invoice fan-out (by agentId) ─────────────────────────────────────────────

export const getInvoicesByAdmin = async (agentIds) => {
  if (!agentIds?.length) return [];
  const results = await Promise.all(
    agentIds.map((uid) =>
      getDocs(query(collection(db, "invoices"), where("agentId", "==", uid))).then(
        (snap) => snap.docs.map((d) => ({ id: d.id, agentId: uid, ...d.data() }))
      )
    )
  );
  return results
    .flat()
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// ── Customer queries (via lead join) ─────────────────────────────────────────

export const getCustomersByAdmin = async (adminId, orgId = null) => {
  if (!adminId) return [];
  const leadsSnap = await getDocs(
    query(collection(db, "leads"), ...orgFilter(orgId), where("adminId", "==", adminId))
  );
  const customerIds = [
    ...new Set(
      leadsSnap.docs
        .map((d) => d.data().customerId)
        .filter(Boolean)
    ),
  ];
  if (!customerIds.length) return [];
  const customers = await Promise.all(
    customerIds.map((id) =>
      getDoc(doc(db, "customers", id)).then((s) =>
        s.exists() && (!orgId || s.data().orgId === orgId) ? { id: s.id, ...s.data() } : null
      )
    )
  );
  return customers.filter(Boolean);
};

// ── Dashboard stats ───────────────────────────────────────────────────────────

export const getAdminDashboardStats = async (adminId, orgId = null) => {
  if (!adminId) return null;
  const [agents, leads, bookings] = await Promise.all([
    getAgentsByAdmin(adminId, orgId),
    getLeadsByAdmin(adminId, orgId),
    getBookingsByAdmin(adminId, orgId),
  ]);

  const agentIds = agents.map((a) => a.id);
  const quotations = await getQuotationsByAdmin(agentIds, orgId);

  const leadStatusCounts = leads.reduce((acc, l) => {
    const s = l.status || "New";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const quotationStatusCounts = quotations.reduce((acc, q) => {
    const s = q.status || "Draft";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const unassigned = leads.filter((l) => !l.agentId).length;

  return {
    agents,
    agentIds,
    leads,
    bookings,
    quotations,
    leadStatusCounts,
    quotationStatusCounts,
    unassigned,
    totalLeads: leads.length,
    totalBookings: bookings.length,
    totalQuotations: quotations.length,
  };
};
