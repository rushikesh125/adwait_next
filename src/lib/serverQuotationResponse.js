import { admin, adminDb } from "@/firebase/admin";
import { buildBookingFromQuotation } from "@/utils/bookingFromQuotation";

function generateBookingRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${year}-${rand}`;
}

async function createQuotationResponseNotification({ agentId, quotation, status,quotationId  }) {
  if (!agentId || !["Accepted", "Rejected"].includes(status)) return;

  const label = quotation.packageName || quotation.customerName || "Quotation";
  const isAccepted = status === "Accepted";

  // Write notification doc
  const notifRef = await adminDb.collection("notifications").add({
    userId: agentId,
    type: isAccepted ? "quotation_accepted" : "quotation_rejected",
    title: isAccepted ? "Quotation Accepted 🎉" : "Quotation Rejected",
    message: `"${label}" has been ${isAccepted ? "accepted" : "rejected"} by the customer.`,
    link: `/agent-panel/my-quatation?quoteId=${quotationId || ""}`,
    read: false,
    priority: isAccepted ? "high" : "normal",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ── ADD THIS — trigger push to device ──────────────────────────────────
  try {
    const pushPayload = {
      userId: agentId,
      title: isAccepted ? "Quotation Accepted 🎉" : "Quotation Rejected",
      message: `"${label}" has been ${isAccepted ? "accepted" : "rejected"} by the customer.`,
      type: isAccepted ? "quotation_accepted" : "quotation_rejected",
      link: "/agent-panel/my-quatation",
      priority: isAccepted ? "high" : "normal",
    };

    // Use absolute URL — this runs server-side so relative URLs don't work
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json","x-push-secret": process.env.NEXT_PUBLIC_PUSH_SECRET ?? "",  },
      body: JSON.stringify(pushPayload),
    });
  } catch (err) {
    // Non-fatal — notification doc already written, push is best-effort
    console.warn("[serverQuotationResponse] Push failed:", err.message);
  }
}
export async function respondToQuotationByTokenServer(token, action) {
  if (!token || !["accept", "reject"].includes(action)) {
    const error = new Error("Invalid request");
    error.status = 400;
    throw error;
  }

  const snap = await adminDb
    .collectionGroup("packages")
    .where("shareToken", "==", token)
    .limit(1)
    .get();

  if (snap.empty) {
    const error = new Error("Quotation not found");
    error.status = 404;
    throw error;
  }

  const docSnap = snap.docs[0];
  const data = docSnap.data();
  const ref = docSnap.ref;
  const agentId = ref.parent.parent.id;

  if (data.shareExpiresAt && Date.now() > data.shareExpiresAt) {
    const error = new Error("Link expired");
    error.status = 410;
    throw error;
  }

  if (["Accepted", "Rejected"].includes(data.status)) {
    return { status: data.status, alreadyHandled: true, bookingId: data.bookingId || null };
  }

  const newStatus = action === "accept" ? "Accepted" : "Rejected";

  if (newStatus === "Accepted") {
    if (data.convertedToBooking) {
      return { status: "Accepted", alreadyHandled: true, bookingId: data.bookingId || null };
    }

    const bookingPayload = buildBookingFromQuotation({
      ...data,
      id: docSnap.id,
    });

    const bookingRef = await adminDb.collection("bookings").add({
      ...bookingPayload,
      agentId,
      bookingRef: generateBookingRef(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await ref.update({
      status: "Accepted",
      respondedAt: Date.now(),
      convertedToBooking: true,
      bookingId: bookingRef.id,
    });

    await createQuotationResponseNotification({
      agentId,
      quotation: data,
      status: "Accepted",
      quotationId: docSnap.id,  // ← ADD
    });

    return { status: "Accepted", bookingId: bookingRef.id };
  }

  await ref.update({
    status: "Rejected",
    respondedAt: Date.now(),
    
  });

  await createQuotationResponseNotification({
    agentId,
    quotation: data,
    status: "Rejected",
    quotationId: docSnap.id,  // ← ADDNEXT_PUBLIC_APP_URL
  });

  return { status: "Rejected" };
}
