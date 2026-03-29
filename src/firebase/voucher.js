import { db } from "./config"; // Adjust path to your firebase config
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

export async function saveVoucherToFirestore(agentId, quotationId, voucherData) {
  const path = `saved_packages_by_agents/${agentId}/packages/${quotationId}/vouchers`;
  return await addDoc(collection(db, path), {
    ...voucherData,
    createdAt: serverTimestamp(),
    status: "Generated"
  });
}