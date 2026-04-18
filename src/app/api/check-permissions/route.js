/**
 * app/api/check-permission/route.js
 *
 * A lightweight server-side endpoint that verifies whether an agent
 * has been granted access to a specific AI feature before the actual
 * AI API call is made.
 *
 * Usage (from any other API route or client):
 *   POST /api/check-permission
 *   Body: { uid: "agent_uid", permission: "itinerary_ai" }
 *   Response: { allowed: true } or { allowed: false, reason: "..." }
 *
 * All AI API routes should call this first and return 403 if not allowed.
 */

import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";

// The full list of valid permission keys.
// Any key NOT in this list is rejected immediately.
const VALID_PERMISSIONS = [
  "itinerary_ai",
  "hotel_fetch_ai",
  "map_location_ai",
];

export async function POST(req) {
  // ── 1. Parse body ─────────────────────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { allowed: false, reason: "Invalid request body." },
      { status: 400 }
    );
  }

  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (error) {
    return Response.json(
      { allowed: false, reason: error.message },
      { status: error.status || 401 }
    );
  }

  const permission = body?.permission;
  const targetUid = body?.uid || requester.uid;

  // ── 2. Validate inputs ───────────────────────────────────────────────────
  if (!targetUid || typeof targetUid !== "string") {
    return Response.json(
      { allowed: false, reason: "Missing or invalid uid." },
      { status: 400 }
    );
  }

  const canInspectOthers =
    requester.role === "admin" || requester.role === "superadmin";
  if (targetUid !== requester.uid && !canInspectOthers) {
    return Response.json(
      { allowed: false, reason: "You can only check your own permissions." },
      { status: 403 }
    );
  }

  if (!permission || !VALID_PERMISSIONS.includes(permission)) {
    return Response.json(
      {
        allowed: false,
        reason: `Unknown permission key: "${permission}".`,
      },
      { status: 400 }
    );
  }

  // ── 3. Check Firestore ───────────────────────────────────────────────────
  try {
    const snap = await adminDb.collection("agentPermissions").doc(targetUid).get();

    if (!snap.exists) {
      // No document = agent was never granted any permissions
      return Response.json(
        {
          allowed: false,
          reason:
            "No permissions configured for this agent. Contact your admin.",
        },
        { status: 403 }
      );
    }

    const data = snap.data();
    const isAllowed = data?.[permission] === true;

    if (!isAllowed) {
      return Response.json(
        {
          allowed: false,
          reason: `You don't have access to this feature. Ask your admin to enable "${permission}".`,
        },
        { status: 403 }
      );
    }

    return Response.json({ allowed: true }, { status: 200 });
  } catch (err) {
    console.error("[check-permission] Firestore error:", err);
    return Response.json(
      {
        allowed: false,
        reason: "Permission check failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
