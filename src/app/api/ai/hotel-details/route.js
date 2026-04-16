export async function POST(req) {
  try {
    const { hotelName } = await req.json();

    if (!hotelName) {
      return Response.json({ error: "Hotel name required" }, { status: 400 });
    }

    const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    // STEP 1: Find place (STRICT search)
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        hotelName
      )}&key=${API_KEY}`
    );

    const searchData = await searchRes.json();

    const place = searchData.results?.[0];

    if (!place) {
      return Response.json({
        address: "",
        phone: "",
        mapsLink: "",
      });
    }

    //  STEP 2: Get FULL details (VERY IMPORTANT)
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,url&key=${API_KEY}`
    );

    const detailsData = await detailsRes.json();
    const result = detailsData.result;

    return Response.json({
      address: result?.formatted_address || "",
      phone: result?.formatted_phone_number || "",
      mapsLink: result?.url || "", // ✅ exact Google Maps link
    });
  } catch (err) {
    console.error("Places API Error:", err.message);

    return Response.json({
      address: "",
      phone: "",
      mapsLink: "",
    });
  }
}