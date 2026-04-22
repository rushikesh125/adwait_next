export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return Response.json(
        { error: "locationId is required" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?language=en&currency=INR&key=${process.env.TRIPADVISOR_API_KEY}`,
      {
        cache: "no-store",
        headers: {
          Referer: "https://portal.adwaittours.com",
          Origin: "https://portal.adwaittours.com",
        },
      },
    );

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
