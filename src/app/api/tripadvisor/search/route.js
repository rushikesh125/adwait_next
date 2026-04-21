export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const apiKey = process.env.TRIPADVISOR_API_KEY;

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    if (!apiKey) {
      return Response.json(
        { error: "TripAdvisor API key is not configured on the server" },
        { status: 500 },
      );
    }

    const res = await fetch(
      `https://api.content.tripadvisor.com/api/v1/location/search?searchQuery=${encodeURIComponent(query)}&category=hotels&language=en&key=${apiKey}`,
      {
        cache: "no-store",
        headers: {
          Referer: "https://portal.adwaittours.com",
          Origin: "https://portal.adwaittours.com",
        },
      },
    );

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        {
          error:
            data?.error?.message ||
            data?.message ||
            "TripAdvisor search failed",
        },
        { status: res.status },
      );
    }
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
