import { NextResponse } from "next/server";
import { cleanupExpiredHotelSeasons } from "@/lib/hotelSeasonCleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getCronSecret = () =>
  process.env.CRON_SECRET || process.env.HOTEL_CLEANUP_SECRET || "";

const isAuthorized = (request) => {
  const secret = getCronSecret();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") || "";
  const headerSecret = request.headers.get("x-cron-secret") || "";

  return authorization === `Bearer ${secret}` || headerSecret === secret;
};

const getDryRun = (request) =>
  ["1", "true", "yes"].includes(
    (request.nextUrl.searchParams.get("dryRun") || "").toLowerCase(),
  );

async function runCleanup(request) {
  if (!getCronSecret() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is required in production." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredHotelSeasons({
      dryRun: getDryRun(request),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[hotel-season-cleanup] Failed:", error);
    return NextResponse.json(
      { error: "Hotel season cleanup failed" },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  return runCleanup(request);
}

export async function POST(request) {
  return runCleanup(request);
}
