import { db } from "./config";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// ── Create a new organization ─────────────────────────────────────────────────

export const createOrganization = async ({ name, slug, plan = "basic", ownerId }) => {
  // Check slug uniqueness
  const existing = await getDocs(
    query(collection(db, "organizations"), where("slug", "==", slug.trim().toLowerCase()))
  );
  if (!existing.empty) throw new Error("An organization with this slug already exists.");

  const ref = await addDoc(collection(db, "organizations"), {
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    plan,
    ownerId: ownerId || null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
};

// ── Get all organizations ─────────────────────────────────────────────────────

export const getAllOrganizations = async () => {
  const snap = await getDocs(collection(db, "organizations"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Get a single organization ─────────────────────────────────────────────────

export const getOrganization = async (orgId) => {
  const snap = await getDoc(doc(db, "organizations", orgId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ── Update organization ───────────────────────────────────────────────────────

export const updateOrganization = async (orgId, updates) => {
  await updateDoc(doc(db, "organizations", orgId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// ── Toggle org active state ───────────────────────────────────────────────────

export const toggleOrganizationActive = async (orgId, isActive) => {
  await updateDoc(doc(db, "organizations", orgId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

// ── Assign admin to org ───────────────────────────────────────────────────────
// Sets orgId on the admin doc. Pass null to unassign.

export const assignAdminToOrg = async (adminId, orgId) => {
  await updateDoc(doc(db, "admins", adminId), {
    orgId: orgId || null,
    updatedAt: serverTimestamp(),
  });
};

// ── Assign agent to org ───────────────────────────────────────────────────────
// Sets orgId on the agent doc. Pass null to unassign.

export const assignAgentToOrg = async (agentId, orgId) => {
  await updateDoc(doc(db, "agents", agentId), {
    orgId: orgId || null,
    updatedAt: serverTimestamp(),
  });
};

// ── Bulk assign: set orgId on all agents belonging to an admin ────────────────

export const assignAdminAgentsToOrg = async (adminId, orgId) => {
  const snap = await getDocs(
    query(collection(db, "agents"), where("adminId", "==", adminId))
  );
  if (snap.empty) return 0;
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(d.ref, { orgId: orgId || null, updatedAt: serverTimestamp() })
    )
  );
  return snap.size;
};

// ── Get admins for an org ─────────────────────────────────────────────────────

export const getAdminsByOrg = async (orgId) => {
  const snap = await getDocs(
    query(collection(db, "admins"), where("orgId", "==", orgId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Get agents for an org ─────────────────────────────────────────────────────

export const getAgentsByOrg = async (orgId) => {
  const snap = await getDocs(
    query(collection(db, "agents"), where("orgId", "==", orgId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Get org member counts (for stats) ────────────────────────────────────────

export const getOrgMemberCounts = async (orgId) => {
  const [adminsSnap, agentsSnap] = await Promise.all([
    getDocs(query(collection(db, "admins"), where("orgId", "==", orgId))),
    getDocs(query(collection(db, "agents"), where("orgId", "==", orgId))),
  ]);
  return {
    admins: adminsSnap.size,
    agents: agentsSnap.size,
  };
};

// ── Get unassigned admins (no orgId) ─────────────────────────────────────────

export const getUnassignedAdmins = async () => {
  // Firestore doesn't support "field doesn't exist" natively, so we fetch all
  // and filter client-side — acceptable since admin list is always small.
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => !a.orgId);
};

// ── Get unassigned agents (no orgId) ─────────────────────────────────────────

export const getUnassignedAgents = async () => {
  const snap = await getDocs(collection(db, "agents"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => !a.orgId);
};