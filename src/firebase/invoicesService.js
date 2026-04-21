import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

const COLLECTION = "invoices";

function logError(context, error) {
  console.error(`[invoicesService] ${context}:`, error?.message ?? error);
}

export async function getNextInvoiceNumber() {
  const ref = doc(db, "config", "voucher_counters");
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const year = new Date().getFullYear();
    const key = `invoice_${year}`;
    const current = data[key] ?? 0;
    const next = current + 1;
    tx.set(ref, { ...data, [key]: next }, { merge: true });
    return `ADW-INV-${year}-${String(next).padStart(4, "0")}`;
  });
}

export function computeLineItem(item) {
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const subtotal = qty * unitPrice;

  const discountValue = Number(item.discountValue) || 0;
  const discountAmount =
    item.discountType === "percentage"
      ? (subtotal * discountValue) / 100
      : Math.min(discountValue, subtotal);

  const taxableAmount = subtotal - discountAmount;
  const gstRate = Number(item.gstRate) || 0;
  const gstAmount = (taxableAmount * gstRate) / 100;
  const total = taxableAmount + gstAmount;

  return { ...item, subtotal, discountAmount, taxableAmount, gstAmount, total };
}

export function computeInvoiceTotals(lineItems, gstType = "intra") {
  const computed = lineItems.map(computeLineItem);
  const subtotal = computed.reduce((s, i) => s + i.subtotal, 0);
  const discountTotal = computed.reduce((s, i) => s + i.discountAmount, 0);
  const taxableAmount = computed.reduce((s, i) => s + i.taxableAmount, 0);
  const gstTotal = computed.reduce((s, i) => s + i.gstAmount, 0);
  const grandTotal = taxableAmount + gstTotal;

  const cgst = gstType === "intra" ? gstTotal / 2 : 0;
  const sgst = gstType === "intra" ? gstTotal / 2 : 0;
  const igst = gstType === "inter" ? gstTotal : 0;

  return { subtotal, discountTotal, taxableAmount, gstTotal, grandTotal, cgst, sgst, igst };
}

export function computePaymentStatus(grandTotal, amountReceived) {
  const total = Number(grandTotal) || 0;
  const paid = Number(amountReceived) || 0;
  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partial";
}

export const createInvoice = async (data) => {
  try {
    const invoiceNumber = await getNextInvoiceNumber();
    const totals = computeInvoiceTotals(data.lineItems || [], data.gstType);

    // Ensure all imported payments have a stable id
    const payments = (data.payments || []).map((p, i) =>
      p.id ? p : { ...p, id: `pay_${Date.now()}_${i}` }
    );
    // Compute amountReceived from payments when pre-populated (e.g. imported from booking)
    const amountReceived = payments.length > 0
      ? payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : (Number(data.amountReceived) || 0);

    const paymentStatus = computePaymentStatus(totals.grandTotal, amountReceived);

    const ref = await addDoc(collection(db, COLLECTION), {
      ...data,
      invoiceNumber,
      ...totals,
      amountReceived,
      amountDue: totals.grandTotal - amountReceived,
      paymentStatus,
      status: data.status || "Draft",
      payments,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    logError("createInvoice", e);
    throw e;
  }
};

export const getInvoicesByAgent = async (agentId) => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("agentId", "==", agentId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by createdAt descending in JS to avoid needing a composite index
    results.sort((a, b) => {
      const ta = a.createdAt?.seconds ?? a.createdAt?.toMillis?.() / 1000 ?? 0;
      const tb = b.createdAt?.seconds ?? b.createdAt?.toMillis?.() / 1000 ?? 0;
      return tb - ta;
    });
    return results;
  } catch (e) {
    logError("getInvoicesByAgent", e);
    throw e;
  }
};

export const getInvoiceById = async (id) => {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    logError("getInvoiceById", e);
    throw e;
  }
};

export const updateInvoice = async (id, data) => {
  try {
    const totals = computeInvoiceTotals(data.lineItems || [], data.gstType);
    const amountReceived = Number(data.amountReceived) || 0;
    const paymentStatus = computePaymentStatus(totals.grandTotal, amountReceived);

    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      ...totals,
      amountReceived,
      amountDue: totals.grandTotal - amountReceived,
      paymentStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    logError("updateInvoice", e);
    throw e;
  }
};

export const addPaymentToInvoice = async (id, payment) => {
  try {
    const invoice = await getInvoiceById(id);
    if (!invoice) throw new Error("Invoice not found");

    const payments = [...(invoice.payments || []), { ...payment, id: `pay_${Date.now()}` }];
    const amountReceived = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const amountDue = (invoice.grandTotal || 0) - amountReceived;
    const paymentStatus = computePaymentStatus(invoice.grandTotal, amountReceived);

    await updateDoc(doc(db, COLLECTION, id), {
      payments,
      amountReceived,
      amountDue,
      paymentStatus,
      updatedAt: serverTimestamp(),
    });

    return { payments, amountReceived, amountDue, paymentStatus };
  } catch (e) {
    logError("addPaymentToInvoice", e);
    throw e;
  }
};

export const deletePaymentFromInvoice = async (id, paymentId) => {
  try {
    const invoice = await getInvoiceById(id);
    if (!invoice) throw new Error("Invoice not found");

    const payments = (invoice.payments || []).filter((p) => p.id !== paymentId);
    const amountReceived = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const amountDue = (invoice.grandTotal || 0) - amountReceived;
    const paymentStatus = computePaymentStatus(invoice.grandTotal, amountReceived);

    await updateDoc(doc(db, COLLECTION, id), {
      payments,
      amountReceived,
      amountDue,
      paymentStatus,
      updatedAt: serverTimestamp(),
    });

    return { payments, amountReceived, amountDue, paymentStatus };
  } catch (e) {
    logError("deletePaymentFromInvoice", e);
    throw e;
  }
};

export const deleteInvoice = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (e) {
    logError("deleteInvoice", e);
    throw e;
  }
};

export const getInvoicesByBooking = async (bookingId) => {
  try {
    const q = query(collection(db, COLLECTION), where("bookingId", "==", bookingId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    logError("getInvoicesByBooking", e);
    throw e;
  }
};
