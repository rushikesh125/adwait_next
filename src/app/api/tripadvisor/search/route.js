export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.content.tripadvisor.com/api/v1/location/search?searchQuery=${encodeURIComponent(query)}&category=hotels&language=en&key=${process.env.TRIPADVISOR_API_KEY}`,
      { cache: "no-store" }
    );

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}