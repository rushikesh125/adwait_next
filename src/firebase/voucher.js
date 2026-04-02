// firebase/voucher.js
import { db } from "./config";
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Generate next voucher number (atomic counter)
 */
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

/**
 * Save voucher to Firestore.
 * - quotationId provided  → saves under packages/{quotationId}/vouchers
 * - no quotationId        → saves under standalone_vouchers
 */
export async function saveVoucherToFirestore(agentId, quotationId, voucherData) {
  if (!agentId) throw new Error("Missing agentId");

  const path = quotationId
    ? `saved_packages_by_agents/${agentId}/packages/${quotationId}/vouchers`
    : `saved_packages_by_agents/${agentId}/standalone_vouchers`;

  console.log("[voucher] saving to path:", path);

  const docRef = await addDoc(collection(db, path), {
    ...voucherData,
    agentId,
    quotationId: quotationId || null,
    createdAt: serverTimestamp(),
    status: "Generated",
  });

  console.log("[voucher] saved with id:", docRef.id);
  return docRef;
}

/**
 * Fetch ALL vouchers for an agent.
 *
 * Strategy (no orderBy on subcollections — avoids index errors on new collections):
 *  1. Read standalone_vouchers  (no orderBy)
 *  2. Read every package doc, then its vouchers subcollection  (no orderBy)
 *  3. Sort the merged array in JS by createdAt descending
 */
export async function fetchAllVouchersForAgent(agentId) {
  if (!agentId) {
    console.warn("[voucher] fetchAllVouchersForAgent called without agentId");
    return [];
  }

  const results = [];

  // ── 1. Standalone vouchers ──────────────────────────────────────────────
  try {
    const snap = await getDocs(
      collection(db, `saved_packages_by_agents/${agentId}/standalone_vouchers`)
    );
    snap.docs.forEach((d) => {
      results.push({ id: d.id, _collection: "standalone", ...d.data() });
    });
    console.log("[voucher] standalone vouchers found:", snap.docs.length);
  } catch (e) {
    // Collection simply doesn't exist yet — not an error
    console.log("[voucher] no standalone_vouchers collection yet:", e.code);
  }

  // ── 2. Vouchers inside every quotation package ──────────────────────────
  try {
    const packagesSnap = await getDocs(
      collection(db, `saved_packages_by_agents/${agentId}/packages`)
    );
    console.log("[voucher] total packages to scan:", packagesSnap.docs.length);

    // Use Promise.allSettled so one bad package doesn't abort the rest
    const tasks = packagesSnap.docs.map(async (pkgDoc) => {
      try {
        const vSnap = await getDocs(
          collection(
            db,
            `saved_packages_by_agents/${agentId}/packages/${pkgDoc.id}/vouchers`
          )
        );
        vSnap.docs.forEach((d) => {
          results.push({
            id: d.id,
            _collection: "quotation",
            _quotationDocId: pkgDoc.id,
            ...d.data(),
          });
        });
        if (vSnap.docs.length > 0) {
          console.log(`[voucher] package ${pkgDoc.id}: ${vSnap.docs.length} voucher(s)`);
        }
      } catch (e) {
        // Subcollection doesn't exist for this package — skip silently
      }
    });

    await Promise.allSettled(tasks);
  } catch (e) {
    console.error("[voucher] error reading packages:", e);
  }

  // ── 3. Sort by createdAt descending (JS-side, no Firestore index needed) ─
  results.sort((a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt?.toMillis?.() / 1000 ?? 0;
    const tb = b.createdAt?.seconds ?? b.createdAt?.toMillis?.() / 1000 ?? 0;
    return tb - ta;
  });

  console.log("[voucher] total vouchers fetched:", results.length);
  return results;
}

/**
 * Delete a voucher document.
 * Works for both standalone and quotation-linked vouchers.
 */
export async function deleteVoucherDocument(agentId, voucherRecord) {
  if (!agentId) throw new Error("Missing agentId");

  let path;
  if (voucherRecord._collection === "standalone") {
    path = `saved_packages_by_agents/${agentId}/standalone_vouchers/${voucherRecord.id}`;
  } else {
    const quotationDocId = voucherRecord._quotationDocId || voucherRecord.quotationId;
    if (!quotationDocId) throw new Error("Missing quotationDocId for linked voucher");
    path = `saved_packages_by_agents/${agentId}/packages/${quotationDocId}/vouchers/${voucherRecord.id}`;
  }

  console.log("[voucher] deleting:", path);
  await deleteDoc(doc(db, path));
}