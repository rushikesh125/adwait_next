import { adminAuth, adminDb } from "@/firebase/admin";

const ROLE_COLLECTIONS = [
  { collection: "super_admins", role: "superadmin" },
  { collection: "admins", role: "admin" },
  { collection: "agents", role: "agent" },
  { collection: "users", role: null },
];

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

async function getUserProfile(uid) {
  for (const entry of ROLE_COLLECTIONS) {
    const snap = await adminDb.collection(entry.collection).doc(uid).get();
    if (snap.exists) {
      return {
        uid,
        role: entry.role || snap.data()?.role || null,
        profile: snap.data(),
        collection: entry.collection,
      };
    }
  }

  return {
    uid,
    role: null,
    profile: null,
    collection: null,
  };
}

export async function requireAuthenticatedUser(request) {
  const token = getBearerToken(request);
  if (!token) {
    const error = new Error("Missing bearer token.");
    error.status = 401;
    throw error;
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch {
    const error = new Error("Invalid or expired authentication token.");
    error.status = 401;
    throw error;
  }

  return getUserProfile(decodedToken.uid);
}

export async function requireRole(request, allowedRoles = []) {
  const user = await requireAuthenticatedUser(request);

  if (
    allowedRoles.length > 0 &&
    (!user.role || !allowedRoles.includes(user.role))
  ) {
    const error = new Error("You do not have permission to perform this action.");
    error.status = 403;
    throw error;
  }

  return user;
}
