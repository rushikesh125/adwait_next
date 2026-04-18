import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 401 });
  }

  // ── 2. Rate limit — 30 lookups per minute per user ────────────────────────
  const rl = rateLimit({ uid: requester.uid, action: "hotel-details", limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let hotelName;
  try {
    ({ hotelName } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  if (!hotelName) {
    return Response.json({ error: "Hotel name required" }, { status: 400 });
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return Response.json({ error: "Maps service is not configured." }, { status: 503 });
  }

  try {
    // STEP 1: Find place
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(hotelName)}&key=${API_KEY}`
    );
    const searchData = await searchRes.json();
    const place = searchData.results?.[0];

    if (!place) {
      return Response.json({ address: "", phone: "", mapsLink: "" });
    }

    // STEP 2: Get full details
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,url&key=${API_KEY}`
    );
    const detailsData = await detailsRes.json();
    const result = detailsData.result;

    return Response.json({
      address: result?.formatted_address || "",
      phone: result?.formatted_phone_number || "",
      mapsLink: result?.url || "",
    });
  } catch (err) {
    console.error("[hotel-details] Places API error:", err.message);
    return Response.json({ address: "", phone: "", mapsLink: "" });
  }
}
