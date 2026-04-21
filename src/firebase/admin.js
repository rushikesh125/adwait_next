import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  const { FIREBASE_ADMIN_PROJECT_ID: projectId, FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail, FIREBASE_ADMIN_PRIVATE_KEY: privateKey } = process.env;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials missing. Add FIREBASE_ADMIN_PROJECT_ID, " +
      "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY to Vercel environment variables."
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

// Lazy Proxy: initialization runs on first property access (request time),
// not at module load time (build time). Preserves the original API surface.
let _auth = null;
let _db   = null;

export const adminAuth = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_auth) _auth = admin.auth(initAdmin());
      const val = _auth[prop];
      return typeof val === "function" ? val.bind(_auth) : val;
    },
  }
);

export const adminDb = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_db) _db = admin.firestore(initAdmin());
      const val = _db[prop];
      return typeof val === "function" ? val.bind(_db) : val;
    },
  }
);

export { admin };
