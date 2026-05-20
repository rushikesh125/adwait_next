/**
 * quotationShare.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages shareable preview links for quotations.
 *
 * Firestore fields added to the quotation document:
 *   shareToken     – string  — random 20-char token (URL-safe)
 *   shareExpiresAt – number  — Unix ms timestamp (default: now + 60 days)
 *   showPricing    – boolean — whether the grand total is visible on the preview
 *   shareCreatedAt – number  — Unix ms timestamp
 */

import {
  doc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";

const SHARE_TTL_DAYS = 60;
const AGENTS_COLLECTION = "saved_packages_by_agents";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a URL-safe random token of given length. */
function generateToken(length = 20) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

/** Returns the expiry timestamp (ms) from now + days. */
function expiryMs(days = SHARE_TTL_DAYS) {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates (or refreshes) a share token for a quotation.
 *
 * @param {string} agentId
 * @param {string} quotationId
 * @param {boolean} showPricing  - whether to reveal grand total
 * @param {number}  ttlDays      - expiry days from now (default 60)
 * @returns {Promise<{ token: string, expiresAt: number, showPricing: boolean }>}
 */
export async function createShareToken(
  agentId,
  quotationId,
  showPricing = false,
  ttlDays = SHARE_TTL_DAYS
) {
  const token = generateToken();
  const expiresAt = expiryMs(ttlDays);

  const ref = doc(
    db,
    AGENTS_COLLECTION,
    agentId,
    "packages",
    quotationId
  );

  await updateDoc(ref, {
    shareToken: token,
    shareExpiresAt: expiresAt,
    shareCreatedAt: Date.now(),
    showPricing,
  });

  return { token, expiresAt, showPricing };
}

/**
 * Updates only the showPricing flag on an existing share link.
 * Does NOT regenerate the token or reset expiry.
 */
export async function updateSharePricing(agentId, quotationId, showPricing) {
  const ref = doc(
    db,
    AGENTS_COLLECTION,
    agentId,
    "packages",
    quotationId
  );
  await updateDoc(ref, { showPricing });
}

/**
 * Revokes a share link by clearing the token fields.
 */
export async function revokeShareToken(agentId, quotationId) {
  const ref = doc(
    db,
    AGENTS_COLLECTION,
    agentId,
    "packages",
    quotationId
  );
  await updateDoc(ref, {
    shareToken: null,
    shareExpiresAt: null,
    shareCreatedAt: null,
    showPricing: false,
  });
}

/**
 * Looks up a quotation by its public shareToken across ALL agents.
 * This is called from the public /preview/[token] page — no auth context.
 *
 * Strategy: uses a collectionGroup query on "packages" where shareToken == token.
 * Requires a Firestore composite index on (shareToken).
 *
 * @param {string} token
 * @returns {Promise<{ quotation: object, isExpired: boolean } | null>}
 */
export async function getQuotationByShareToken(token) {
  if (!token) return null;

  try {
    const q = query(
      collection(db, "quotation_shares"),
      where("shareToken", "==", token)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      const isExpired =
        data.shareExpiresAt != null && Date.now() > data.shareExpiresAt;
      return { quotation: data, isExpired };
    }
  } catch {
    // Fall through to collectionGroup
  }

  // Primary approach: collectionGroup query
  try {
    const cgQuery = query(
      collection(db, "quotation_shares"),
      where("shareToken", "==", token)
    );
    // Use collectionGroup for nested packages
    const { collectionGroup } = await import("firebase/firestore");
    const cgRef = collectionGroup(db, "packages");
    const cgSnap = await getDocs(
      query(cgRef, where("shareToken", "==", token))
    );

    if (cgSnap.empty) return null;

    const docData = cgSnap.docs[0].data();
    const isExpired =
      docData.shareExpiresAt != null && Date.now() > docData.shareExpiresAt;

    // Also check if quotation status is Rejected
    const isRejected = docData.status === "Rejected";

    return {
      quotation: { ...docData, id: cgSnap.docs[0].id },
      isExpired: isExpired || isRejected,
    };
  } catch (err) {
    console.error("[getQuotationByShareToken]", err);
    return null;
  }
}

/**
 * Builds the full preview URL for a given token.
 */
export function buildPreviewUrl(token) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base}/preview/${token}`;
}

/**
 * Returns whether a quotation's share link is still active.
 */
export function isShareActive(quotation) {
  if (!quotation?.shareToken) return false;
  if (quotation.status === "Rejected") return false;
  if (!quotation.shareExpiresAt) return false;
  return Date.now() < quotation.shareExpiresAt;
}




import { createBooking } from "@/firebase/bookingsService";
import { buildBookingFromQuotation } from "@/utils/bookingFromQuotation";

export async function respondToQuotationByToken(token, action) {
  if (!token || !["accept", "reject"].includes(action)) {
    throw new Error("Invalid request");
  }

  const { collectionGroup } = await import("firebase/firestore");

  const cgRef = collectionGroup(db, "packages");
  const snap = await getDocs(
    query(cgRef, where("shareToken", "==", token))
  );

  if (snap.empty) {
    throw new Error("Quotation not found");
  }

  const docSnap = snap.docs[0];
  const data = docSnap.data();
  const ref = docSnap.ref;

  // ✅ Extract agentId from path
  const agentId = ref.parent.parent.id;

  // ⚠️ Expiry check
  if (data.shareExpiresAt && Date.now() > data.shareExpiresAt) {
    throw new Error("Link expired");
  }

  // ⚠️ Already handled
  if (["Accepted", "Rejected"].includes(data.status)) {
    return { status: data.status, alreadyHandled: true };
  }

  const newStatus = action === "accept" ? "Accepted" : "Rejected";

  // =========================
  // ✅ ACCEPT FLOW (AUTO BOOKING)
  // =========================
  if (newStatus === "Accepted") {
    // 🚫 Prevent duplicate booking
    if (data.convertedToBooking) {
      return { status: "Accepted", alreadyHandled: true };
    }

    // 🧠 Build booking payload
    const bookingPayload = buildBookingFromQuotation({
      ...data,
      id: docSnap.id,
    });

    // 🚀 Create booking
    const bookingId = await createBooking({
      ...bookingPayload,
      agentId, // ✅ FIXED
      orgId: data.orgId || null,
    });

    // ✅ Update quotation
    await updateDoc(ref, {
      status: "Accepted",
      respondedAt: Date.now(),
      convertedToBooking: true,
      bookingId,
    });

    return { status: "Accepted", bookingId };
  }

  // =========================
  // ❌ REJECT FLOW
  // =========================
  if (newStatus === "Rejected") {
    await updateDoc(ref, {
      status: "Rejected",
      respondedAt: Date.now(),
    });

    return { status: "Rejected" };
  }
}
