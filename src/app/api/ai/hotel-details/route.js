import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

const DEBUG = false; // set true only during local debugging

// ─────────────────────────────────────────────────────────────────────────────
// Permission Guard Helper
//
// Role routing:
//   superadmin → always allowed (no Firestore read)
//   admin      → reads adminPermissions/{uid}
//   agent      → reads agentPermissions/{uid}
//   unknown    → reads agentPermissions/{uid}  (safe default)
// ─────────────────────────────────────────────────────────────────────────────
async function checkHotelPermission(uid, role) {
  if (!uid) return false;

  // Superadmin always has full access
  if (role === "superadmin") return true;

  const collectionName =
    role === "admin" ? "adminPermissions" : "agentPermissions";

  try {
    const snap = await adminDb.collection(collectionName).doc(uid).get();
    if (!snap.exists) return false;
    return snap.data()?.hotel_fetch_ai === true;
  } catch (err) {
    console.error("[hotel-details] Permission check failed:", err.code ?? err.message);
    return false;
  }
}

export async function POST(req) {
  let debug = {};

  // ── 1. Auth ───────────────────────────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
    if (DEBUG) debug.auth = { status: "success", uid: requester.uid, role: requester.role };
  } catch (err) {
    if (DEBUG) debug.auth = { status: "failed", error: err.message };
    return Response.json(
      { error: "AUTH_FAILED", ...(DEBUG && { debug }) },
      { status: err.status || 401 }
    );
  }

  // ── 2. Permission check — role-aware, reads correct collection ────────────
  // Admins must also have hotel_fetch_ai explicitly enabled in adminPermissions.
  // Superadmin is always allowed (handled inside checkHotelPermission).
  const isAllowed = await checkHotelPermission(requester.uid, requester.role);

  if (!isAllowed) {
    return Response.json(
      {
        error: "You don't have access to Hotel AI Fetch. Please contact your super admin to enable this feature.",
        code:  "PERMISSION_DENIED",
      },
      { status: 403 }
    );
  }

  // ── 3. Rate limit ─────────────────────────────────────────────────────────
  const rl = rateLimit({
    uid:      requester.uid,
    action:   "hotel-details",
    limit:    30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    if (DEBUG) debug.rateLimit = { status: "blocked", resetIn: Math.ceil((rl.resetAt - Date.now()) / 1000) };
    return Response.json(
      { error: "RATE_LIMIT", ...(DEBUG && { debug }) },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  if (DEBUG) debug.rateLimit = { status: "ok" };

  // ── 4. Parse body ─────────────────────────────────────────────────────────
  let hotelName;
  try {
    const body = await req.json();
    hotelName  = body.hotelName;
    if (DEBUG) debug.input = { hotelName };
  } catch (err) {
    if (DEBUG) debug.input = { error: "Invalid JSON" };
    return Response.json(
      { error: "INVALID_JSON", ...(DEBUG && { debug }) },
      { status: 400 }
    );
  }

  if (!hotelName || typeof hotelName !== "string" || !hotelName.trim()) {
    return Response.json(
      { error: "HOTEL_NAME_REQUIRED", ...(DEBUG && { debug }) },
      { status: 400 }
    );
  }

  hotelName = hotelName.trim();

  // ── 5. API key check ──────────────────────────────────────────────────────
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    if (DEBUG) debug.config = { mapsKey: "MISSING" };
    return Response.json(
      { error: "MAPS_API_KEY_MISSING", ...(DEBUG && { debug }) },
      { status: 503 }
    );
  }

  if (DEBUG) debug.config = { mapsKey: "OK" };

  try {
    // ── Step 1: Text search ───────────────────────────────────────────────
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      hotelName + " hotel"
    )}&key=${API_KEY}`;

    const searchRes  = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (DEBUG) debug.search = {
      status:       searchData.status,
      resultsCount: searchData.results?.length || 0,
    };

    if (searchData.status !== "OK") {
      return Response.json(
        { error: "GOOGLE_SEARCH_FAILED", ...(DEBUG && { debug }) },
        { status: 500 }
      );
    }

    const place = searchData.results?.[0];

    if (!place) {
      return Response.json({
        address:  "",
        phone:    "",
        mapsLink: "",
        ...(DEBUG && { debug }),
      });
    }

    // ── Step 2: Place details ─────────────────────────────────────────────
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,url&key=${API_KEY}`;

    const detailsRes  = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (DEBUG) debug.details = { status: detailsData.status };

    if (detailsData.status !== "OK") {
      return Response.json(
        { error: "GOOGLE_DETAILS_FAILED", ...(DEBUG && { debug }) },
        { status: 500 }
      );
    }

    const result = detailsData.result;

    return Response.json({
      address:  result?.formatted_address       || "",
      phone:    result?.formatted_phone_number  || "",
      mapsLink: result?.url                     || "",
      ...(DEBUG && { debug }),
    });

  } catch (err) {
    console.error("[hotel-details] Unexpected error:", err.message);
    if (DEBUG) debug.exception = err.message;
    return Response.json(
      { error: "INTERNAL_ERROR", ...(DEBUG && { debug }) },
      { status: 500 }
    );
  }
}