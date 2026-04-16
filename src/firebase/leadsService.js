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

// --- Existing Functions ---
export const addLead = async (data) => {
  return await addDoc(leadsRef, {
    ...data,
    createdAt: serverTimestamp(),
    status: "New",
  });
};

export const getAllLeads = async () => {
  const q = query(leadsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getLeadsByAgent = async (agentId) => {
  const q = query(leadsRef, where("agentId", "==", agentId));
  const snap = await getDocs(q);
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const createAssignedLead = async ({ agentId, customerId, agentName, ...data }) => {
  return await addDoc(leadsRef, {
    ...data,
    agentId,
    assignedAgentId: agentId,
    assignedAgentName: agentName || "",
    customerId: customerId || null,
    createdAt: serverTimestamp(),
    status: "New",
    source: data.source || "Enquiry Form",
  });
};

/**
 * Get all quotations for a lead across all agents
 */
export const getQuotationsForLead = async (leadId) => {
  if (!leadId) return [];
  
  console.log("🔍 getQuotationsForLead called with leadId:", leadId);
  
  try {
    const agentsRef = collection(db, "saved_packages_by_agents");
    const agentSnap = await getDocs(agentsRef);
    console.log("👥 Found agents:", agentSnap.docs.length);
    console.log("👥 Agent IDs:", agentSnap.docs.map(doc => doc.id));
    
    const allQuotations = [];

    for (const agentDoc of agentSnap.docs) {
      console.log("🔍 Checking agent:", agentDoc.id);
      const packagesRef = collection(db, "saved_packages_by_agents", agentDoc.id, "packages");
      const q = query(packagesRef, where("leadId", "==", leadId));
      const packageSnap = await getDocs(q);
      console.log("📦 Quotations found for agent", agentDoc.id, ":", packageSnap.docs.length);
      
      const quotationsForAgent = packageSnap.docs.map(doc => ({
        id: doc.id,
        agentId: agentDoc.id,
        ...doc.data()
      }));
      
      console.log("📋 Quotations data:", quotationsForAgent.map(q => ({ id: q.id, leadId: q.leadId, status: q.status })));
      allQuotations.push(...quotationsForAgent);
    }
    
    console.log("📊 Total quotations found:", allQuotations.length);
    return allQuotations;
  } catch (error) {
    console.error("Error fetching quotations for lead:", error);
    return [];
  }
};

/**
 * Update lead status with business logic:
 * - If status is "Closed Lost", reject all associated quotations
 */
export const updateLeadStatus = async (leadId, newStatus) => {
  if (!leadId) return;

  try {
    const leadRef = doc(db, "leads", leadId);
    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) return;

    const currentStatus = leadSnap.data().status;

    // // 🛑 Prevent overwriting final states incorrectly
    // if (["Closed Won", "Closed Lost"].includes(currentStatus)) return;

    // 🛑 Avoid unnecessary updates
    if (currentStatus === newStatus) return;

    await updateDoc(leadRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error updating lead status:", error);
  }
};

export const updateLeadDetails = async (id, data) => {
  const ref = doc(db, "leads", id);
  await updateDoc(ref, data);
};

// --- New Functions for Profile Page ---

export const getLeadById = async (id) => {
  const ref = doc(db, "leads", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getLeadNotes = async (lid) => {
  const notesRef = collection(db, "leads", lid, "notes");
  const q = query(notesRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLeadNote = async (lid, text, agentName) => {
  const notesRef = collection(db, "leads", lid, "notes");
  return await addDoc(notesRef, {
    text,
    createdBy: agentName,
    createdAt: serverTimestamp(),
  });
};

export const deleteLeadNote = async (lid, noteId) => {
  await deleteDoc(doc(db, "leads", lid, "notes", noteId));
};

export const updateLeadNote = async (lid, noteId, text) => {
  await updateDoc(doc(db, "leads", lid, "notes", noteId), { text });
};

// Assuming quotations are linked via leadId
export const getAgentQuotationsForLead = async (uid, lid) => {
  const q = query(collection(db, "saved_packages_by_agents",uid,"packages"), where("leadId", "==", lid));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteLead = async (id) => {
  await deleteDoc(doc(db, "leads", id));
};

export const deleteQuotation = async (quotationId) => {
  if (!quotationId) throw new Error("Quotation ID is required");

  await deleteDoc(doc(db, "quotations", quotationId));
};
export const rejectAllQuotationsForLead = async (leadId) => {
  try {
    const q = query(
      collectionGroup(db, "packages"),
      where("leadId", "==", leadId)
    );

    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      // 🛑 Skip important statuses
      if (["Booked", "Confirmed"].includes(data.status)) {
        return Promise.resolve();
      }

      return updateDoc(docSnap.ref, {
        status: "Rejected",
        rejectionReason: "Lead Closed Lost",
        updatedAt: new Date().toISOString(),
      });
    });

    await Promise.allSettled(updates); // ✅ safer than Promise.all

  } catch (error) {
    console.error("Error rejecting quotations:", error);
    throw error;
  }
};

export const updateLeadStatusFromQuotation = async (leadId) => {
  if (!leadId) return;

  try {
    const leadRef = doc(db, "leads", leadId);
    const leadSnap = await getDoc(leadRef);

    if (!leadSnap.exists()) return;

    const currentStatus = leadSnap.data().status;

    // // 🛑 Don't override final states
    // if (["Closed Won", "Closed Lost"].includes(currentStatus)) return;

    // 🛑 Avoid unnecessary update
    if (currentStatus === "Quotation Sent") return;

    await updateDoc(leadRef, {
      status: "Quotation Sent",
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error updating lead from quotation:", error);
  }
};