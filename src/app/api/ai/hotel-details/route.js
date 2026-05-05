import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

const DEBUG = true; // 🔥 turn OFF in production

export async function POST(req) {
  let debug = {};

  // ── 1. Auth ─────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
    debug.auth = { status: "success", uid: requester.uid };
  } catch (err) {
    debug.auth = { status: "failed", error: err.message };
    return Response.json(
      { error: "AUTH_FAILED", debug },
      { status: err.status || 401 }
    );
  }

  // ── 2. Rate limit ───────────────────────────────────
  const rl = rateLimit({
    uid: requester.uid,
    action: "hotel-details",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rl.allowed) {
    debug.rateLimit = {
      status: "blocked",
      resetIn: Math.ceil((rl.resetAt - Date.now()) / 1000),
    };

    return Response.json(
      { error: "RATE_LIMIT", debug },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rl.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  debug.rateLimit = { status: "ok" };

  // ── 3. Parse body ───────────────────────────────────
  let hotelName;
  try {
    const body = await req.json();
    hotelName = body.hotelName;
    debug.input = { hotelName };
  } catch (err) {
    debug.input = { error: "Invalid JSON" };
    return Response.json(
      { error: "INVALID_JSON", debug },
      { status: 400 }
    );
  }

  if (!hotelName) {
    debug.input = { error: "Missing hotelName" };
    return Response.json(
      { error: "HOTEL_NAME_REQUIRED", debug },
      { status: 400 }
    );
  }

  // ── 4. API Key check ────────────────────────────────
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    debug.config = { mapsKey: "MISSING" };
    return Response.json(
      { error: "MAPS_API_KEY_MISSING", debug },
      { status: 503 }
    );
  }

  debug.config = { mapsKey: "OK" };

  try {
    // ── STEP 1: Search Place ─────────────────────────
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      hotelName + " hotel"
    )}&key=${API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    debug.search = {
      status: searchData.status,
      resultsCount: searchData.results?.length || 0,
    };

    if (DEBUG) debug.search.raw = searchData;

    if (searchData.status !== "OK") {
      return Response.json(
        { error: "GOOGLE_SEARCH_FAILED", debug },
        { status: 500 }
      );
    }

    const place = searchData.results?.[0];

    if (!place) {
      debug.search.error = "No place found";
      return Response.json({
        address: "",
        phone: "",
        mapsLink: "",
        debug,
      });
    }

    // ── STEP 2: Place Details ────────────────────────
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,url&key=${API_KEY}`;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    debug.details = {
      status: detailsData.status,
    };

    if (DEBUG) debug.details.raw = detailsData;

    if (detailsData.status !== "OK") {
      return Response.json(
        { error: "GOOGLE_DETAILS_FAILED", debug },
        { status: 500 }
      );
    }

    const result = detailsData.result;

    return Response.json({
      address: result?.formatted_address || "",
      phone: result?.formatted_phone_number || "",
      mapsLink: result?.url || "",
      ...(DEBUG && { debug }), // 🔥 include debug only if enabled
    });
  } catch (err) {
    debug.exception = err.message;

    return Response.json(
      { error: "INTERNAL_ERROR", debug },
      { status: 500 }
    );
  }
}