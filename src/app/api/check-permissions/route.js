/**
 * app/api/check-permission/route.js
 *
 * Role-aware permission check:
 *   - superadmin  → always allowed (no Firestore read)
 *   - admin       → reads adminPermissions/{uid}
 *   - agent       → reads agentPermissions/{uid}
 *   - unknown     → reads agentPermissions/{uid} (safe fallback)
 */

import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";

const VALID_PERMISSIONS = ["itinerary_ai", "hotel_fetch_ai", "map_location_ai"];

/** Returns the correct Firestore collection name for a given role. */
function getPermissionCollection(role) {
  if (role === "admin") return "adminPermissions";
  return "agentPermissions"; // agents + unknown roles
}

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

  // ── 2. Authenticate ───────────────────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (error) {
    return Response.json(
      { allowed: false, reason: error.message },
      { status: error.status || 401 }
    );
  }

  // ── 3. Superadmin bypass — always allowed, no Firestore read ──────────────
  if (requester.role === "superadmin") {
    return Response.json({ allowed: true }, { status: 200 });
  }

  const permission = body?.permission;
  // targetUid: caller can inspect another uid only if they are admin/superadmin
  const targetUid  = body?.uid || requester.uid;
  const targetRole = body?.uid && body.uid !== requester.uid
    ? body?.targetRole ?? null   // caller must supply targetRole when inspecting others
    : requester.role;            // inspecting self — use own role

  // ── 4. Validate inputs ────────────────────────────────────────────────────
  if (!targetUid || typeof targetUid !== "string") {
    return Response.json(
      { allowed: false, reason: "Missing or invalid uid." },
      { status: 400 }
    );
  }

  // Only admins/superadmins may inspect other users' permissions
  const canInspectOthers = requester.role === "admin" || requester.role === "superadmin";
  if (targetUid !== requester.uid && !canInspectOthers) {
    return Response.json(
      { allowed: false, reason: "You can only check your own permissions." },
      { status: 403 }
    );
  }

  if (!permission || !VALID_PERMISSIONS.includes(permission)) {
    return Response.json(
      { allowed: false, reason: `Unknown permission key: "${permission}".` },
      { status: 400 }
    );
  }

  // ── 5. Route to correct Firestore collection ──────────────────────────────
  const collectionName = getPermissionCollection(targetRole ?? requester.role);

  try {
    const snap = await adminDb.collection(collectionName).doc(targetUid).get();

    if (!snap.exists) {
      return Response.json(
        {
          allowed: false,
          reason: "No permissions configured for this user. Contact your super admin.",
        },
        { status: 403 }
      );
    }

    const data      = snap.data();
    const isAllowed = data?.[permission] === true;

    if (!isAllowed) {
      return Response.json(
        {
          allowed: false,
          reason: `You don't have access to this feature. Ask your super admin to enable "${permission}".`,
        },
        { status: 403 }
      );
    }

    return Response.json({ allowed: true }, { status: 200 });
  } catch (err) {
    console.error("[check-permission] Firestore error:", err.code ?? err.message);
    return Response.json(
      { allowed: false, reason: "Permission check failed. Please try again." },
      { status: 500 }
    );
  }
}