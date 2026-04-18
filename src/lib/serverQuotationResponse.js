import { admin, adminDb } from "@/firebase/admin";
import { buildBookingFromQuotation } from "@/utils/bookingFromQuotation";

function generateBookingRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${year}-${rand}`;
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

    return { status: "Accepted", bookingId: bookingRef.id };
  }

  await ref.update({
    status: "Rejected",
    respondedAt: Date.now(),
  });

  return { status: "Rejected" };
}
