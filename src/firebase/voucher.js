// firebase/voucher.js
import { db } from "./config";
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { belongsToOrg, orgFilter } from "./orgScope";

export async function getNextVoucherNumber(type) {
  const ref = doc(db, "config", "voucher_counters");
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const current = data[type] ?? 0;
    const next = current + 1;
    tx.set(ref, { ...data, [type]: next }, { merge: true });
    const year = new Date().getFullYear();
    const prefix = type === "hotel" ? "HTL" : "FLT";
    return `ADW-${prefix}-${year}-${String(next).padStart(4, "0")}`;
  });
}

async function assertVoucherBelongsToOrg(agentId, voucherRecord, orgId) {
  if (!orgId) return;

  if (voucherRecord.orgId !== undefined) {
    if (!belongsToOrg(voucherRecord, orgId)) {
      throw new Error("Voucher not found");
    }
    return;
  }

  let path;
  if (voucherRecord._collection === "standalone") {
    path = `saved_packages_by_agents/${agentId}/standalone_vouchers/${voucherRecord.id}`;
  } else {
    const quotationDocId = voucherRecord._quotationDocId || voucherRecord.quotationId;
    if (!quotationDocId) throw new Error("Missing quotationDocId for linked voucher");
    path = `saved_packages_by_agents/${agentId}/packages/${quotationDocId}/vouchers/${voucherRecord.id}`;
  }

  const snap = await getDoc(doc(db, path));
  if (!snap.exists() || !belongsToOrg(snap.data(), orgId)) {
    throw new Error("Voucher not found");
  }
}

export async function saveVoucherToFirestore(agentId, quotationId, voucherData) {
  if (!agentId) throw new Error("Missing agentId");

  const path = quotationId
    ? `saved_packages_by_agents/${agentId}/packages/${quotationId}/vouchers`
    : `saved_packages_by_agents/${agentId}/standalone_vouchers`;

  const docRef = await addDoc(collection(db, path), {
    ...voucherData,
    agentId,
    quotationId: quotationId || null,
    orgId: voucherData.orgId || null,
    createdAt: serverTimestamp(),
    status: voucherData.status || "Generated",
  });

  return docRef;
}

/**
 * Fetch ALL vouchers for an agent (standalone + quotation-linked).
 * Filters by orgId when provided.
 */
export async function fetchAllVouchersForAgent(agentId, orgId = null) {
  if (!agentId) {
    console.warn("[voucher] fetchAllVouchersForAgent called without agentId");
    return [];
  }

  const results = [];

  // ── 1. Standalone vouchers ──────────────────────────────────────────────
  try {
    const snap = await getDocs(
      query(
        collection(db, `saved_packages_by_agents/${agentId}/standalone_vouchers`),
        ...orgFilter(orgId),
      ),
    );
    snap.docs.forEach((d) => {
      const data = d.data();
      if (belongsToOrg(data, orgId)) {
        results.push({ id: d.id, _collection: "standalone", ...data });
      }
    });
  } catch (e) {
    console.log("[voucher] no standalone_vouchers collection yet:", e.code);
  }

  // ── 2. Vouchers inside org-scoped quotation packages ────────────────────
  try {
    const packagesSnap = await getDocs(
      query(
        collection(db, `saved_packages_by_agents/${agentId}/packages`),
        ...orgFilter(orgId),
      ),
    );

    const tasks = packagesSnap.docs.map(async (pkgDoc) => {
      try {
        const vSnap = await getDocs(
          collection(
            db,
            `saved_packages_by_agents/${agentId}/packages/${pkgDoc.id}/vouchers`,
          ),
        );
        vSnap.docs.forEach((d) => {
          const data = d.data();
          if (belongsToOrg(data, orgId)) {
            results.push({
              id: d.id,
              _collection: "quotation",
              _quotationDocId: pkgDoc.id,
              ...data,
            });
          }
        });
      } catch {
        // Subcollection may not exist for this package
      }
    });

    await Promise.allSettled(tasks);
  } catch (e) {
    console.error("[voucher] error reading packages:", e);
  }

  results.sort((a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt?.toMillis?.() / 1000 ?? 0;
    const tb = b.createdAt?.seconds ?? b.createdAt?.toMillis?.() / 1000 ?? 0;
    return tb - ta;
  });

  return results;
}

export async function deleteVoucherDocument(agentId, voucherRecord, orgId = null) {
  if (!agentId) throw new Error("Missing agentId");
  await assertVoucherBelongsToOrg(agentId, voucherRecord, orgId);

  let path;
  if (voucherRecord._collection === "standalone") {
    path = `saved_packages_by_agents/${agentId}/standalone_vouchers/${voucherRecord.id}`;
  } else {
    const quotationDocId = voucherRecord._quotationDocId || voucherRecord.quotationId;
    if (!quotationDocId) throw new Error("Missing quotationDocId for linked voucher");
    path = `saved_packages_by_agents/${agentId}/packages/${quotationDocId}/vouchers/${voucherRecord.id}`;
  }

  await deleteDoc(doc(db, path));
}

export async function updateVoucherDocument(agentId, voucherRecord, voucherData, orgId = null) {
  if (!agentId) throw new Error("Missing agentId");
  await assertVoucherBelongsToOrg(agentId, voucherRecord, orgId);

  let path;
  if (voucherRecord._collection === "standalone") {
    path = `saved_packages_by_agents/${agentId}/standalone_vouchers/${voucherRecord.id}`;
  } else {
    const quotationDocId = voucherRecord._quotationDocId || voucherRecord.quotationId;
    if (!quotationDocId) throw new Error("Missing quotationDocId for linked voucher");
    path = `saved_packages_by_agents/${agentId}/packages/${quotationDocId}/vouchers/${voucherRecord.id}`;
  }

  await updateDoc(doc(db, path), {
    ...voucherData,
    orgId: voucherData.orgId ?? voucherRecord.orgId ?? null,
    updatedAt: serverTimestamp(),
  });
}
