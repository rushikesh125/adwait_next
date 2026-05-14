// /**
//  * app/api/search-images/route.js
//  *
//  * Proxy for Google Custom Search JSON API — image search.
//  * Keeps API keys server-side, enforces auth + rate limit.
//  *
//  * ENV vars required:
//  *   GOOGLE_SEARCH_API_KEY   — Google Cloud API key with Custom Search API enabled
//  *   GOOGLE_SEARCH_CX        — Programmable Search Engine ID (cx), image search ON,
//  *                             "Search the entire web" enabled
//  *
//  * GET /api/search-images?q=Amber+Fort+Jaipur&start=1
//  *   q      : search query (required)
//  *   start  : pagination offset, 1-based, max 91 (Google limit) — default 1
//  *
//  * Returns:
//  *   { results: ImageResult[], totalResults: number, nextStart: number | null }
//  *
//  * ImageResult: { url, thumbnail, title, source, width, height }
//  */

// import { requireAuthenticatedUser } from "@/lib/serverAuth";
// import { rateLimit } from "@/lib/rateLimit";

// // How many results to request per page (max 10 per Google's API)
// const PAGE_SIZE = 10;

// // Domains known to serve watermarked / low-quality results — filtered out
// const BLOCKED_DOMAINS = [
//   "shutterstock.com",
//   "gettyimages.com",
//   "istockphoto.com",
//   "adobe.com",
//   "dreamstime.com",
//   "depositphotos.com",
//   "alamy.com",
//   "123rf.com",
//   "stocksy.com",
//   "bigstockphoto.com",
// ];

// function isDomainBlocked(url) {
//   try {
//     const hostname = new URL(url).hostname.toLowerCase();
//     return BLOCKED_DOMAINS.some((d) => hostname.includes(d));
//   } catch {
//     return true; // malformed URL — block it
//   }
// }

// /**
//  * Validate and sanitise the search query.
//  * Returns { ok: true, query } or { ok: false, error }
//  */
// function validateQuery(raw) {
//   if (!raw || typeof raw !== "string") {
//     return { ok: false, error: "Query parameter 'q' is required." };
//   }
//   const trimmed = raw.trim();
//   if (trimmed.length === 0) {
//     return { ok: false, error: "Query cannot be empty." };
//   }
//   if (trimmed.length > 200) {
//     return { ok: false, error: "Query is too long (max 200 characters)." };
//   }
//   return { ok: true, query: trimmed };
// }

// export async function GET(req) {
//   // ── 1. Authenticate ──────────────────────────────────────────────────────
//   let requester;
//   try {
//     requester = await requireAuthenticatedUser(req);
//   } catch (err) {
//     return Response.json({ error: err.message }, { status: err.status || 401 });
//   }

//   if (!requester?.uid) {
//     return Response.json(
//       { error: "Authentication required." },
//       { status: 401 },
//     );
//   }

//   // ── 2. Rate limit — 30 searches/min per user ─────────────────────────────
//   // Google gives 100 free queries/day total; 30/min per user is generous
//   // but protects the daily quota from a single user burning it all.
//   const rl = rateLimit({
//     uid: requester.uid,
//     action: "search-images",
//     limit: 30,
//     windowMs: 60_000,
//   });
//   if (!rl.allowed) {
//     return Response.json(
//       { error: "Too many image search requests. Please wait a moment." },
//       {
//         status: 429,
//         headers: {
//           "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
//         },
//       },
//     );
//   }

//   // ── 3. Parse + validate query params ─────────────────────────────────────
//   const { searchParams } = new URL(req.url);
//   const rawQuery = searchParams.get("q");
//   const rawStart = searchParams.get("start");

//   const { ok, query, error: queryError } = validateQuery(rawQuery);
//   if (!ok) {
//     return Response.json({ error: queryError }, { status: 400 });
//   }

//   // start must be 1–91 (Google allows items 1-100, but only 10 per request)
//   let start = parseInt(rawStart, 10);
//   if (isNaN(start) || start < 1) start = 1;
//   if (start > 91) start = 91;

//   // ── 4. Validate env vars ──────────────────────────────────────────────────
//   const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
//   const cx = process.env.GOOGLE_SEARCH_CX;

//   if (!apiKey || !cx) {
//     console.error(
//       "[search-images] Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX",
//     );
//     return Response.json(
//       { error: "Image search is not configured. Please contact support." },
//       { status: 503 },
//     );
//   }

//   // ── 5. Build Google CSE URL ───────────────────────────────────────────────
//   const params = new URLSearchParams({
//     key: apiKey,
//     cx,
//     q: query,
//     searchType: "image",
//     num: String(PAGE_SIZE),
//     start: String(start),
//     // Prefer landscape, high-quality images
//     imgSize: "large",
//     imgType: "photo",
//     safe: "active",
//     // Rights filter — prefer images labeled for reuse
//     // (not strict — just a hint; agents are responsible for final use)
//     rights: "cc_publicdomain|cc_attribute|cc_sharealike",
//   });

//   const apiUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

//   // ── 6. Call Google CSE ────────────────────────────────────────────────────
//   let googleResponse;
//   try {
//     googleResponse = await fetch(apiUrl, {
//       // 10-second timeout
//       signal: AbortSignal.timeout(10_000),
//     });
//   } catch (fetchErr) {
//     console.error(
//       "[search-images] Network error calling Google CSE:",
//       fetchErr.message,
//     );
//     if (fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError") {
//       return Response.json(
//         { error: "Image search timed out. Please try again." },
//         { status: 504 },
//       );
//     }
//     return Response.json(
//       { error: "Failed to reach image search service. Please try again." },
//       { status: 502 },
//     );
//   }

//   // ── 7. Handle non-OK Google responses ────────────────────────────────────
//   if (!googleResponse.ok) {
//     let googleError = `Google API error (${googleResponse.status})`;
//     try {
//       const errBody = await googleResponse.json();
//       console.error("[search-images] Full Google Error:", errBody); // ← Added for debug

//       const msg = errBody?.error?.message;
//       if (msg) googleError = msg;

//       if (googleResponse.status === 403) {
//         return Response.json(
//           {
//             error:
//               "Image search access denied. Please check that both GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX are correct and Custom Search API is enabled.",
//             details: msg,
//           },
//           { status: 403 },
//         );
//       }
//       // Specific known errors
//       if (googleResponse.status === 403) {
//         // Could be quota exceeded or invalid key
//         const reason = errBody?.error?.errors?.[0]?.reason;
//         if (reason === "rateLimitExceeded" || reason === "dailyLimitExceeded") {
//           return Response.json(
//             {
//               error:
//                 "Daily image search quota reached. Please try again tomorrow.",
//             },
//             { status: 429 },
//           );
//         }
//         return Response.json(
//           { error: "Image search access denied. Check API key configuration." },
//           { status: 403 },
//         );
//       }
//     } catch {
//       // ignore parse error
//     }
//     console.error("[search-images] Google CSE error:", googleError);
//     return Response.json(
//       { error: "Image search failed. Please try again." },
//       { status: 502 },
//     );
//   }

//   // ── 8. Parse response ─────────────────────────────────────────────────────
//   let googleData;
//   try {
//     googleData = await googleResponse.json();
//   } catch {
//     return Response.json(
//       { error: "Invalid response from image search service." },
//       { status: 502 },
//     );
//   }

//   // ── 9. Extract + filter results ───────────────────────────────────────────
//   const rawItems = googleData?.items ?? [];
//   const totalResults = parseInt(
//     googleData?.searchInformation?.totalResults ?? "0",
//     10,
//   );

//   const results = rawItems
//     .map((item) => {
//       const url = item?.link;
//       const thumbnail =
//         item?.image?.thumbnailLink ||
//         item?.pagemap?.cse_thumbnail?.[0]?.src ||
//         url;
//       const title = item?.title || "";
//       const source = item?.displayLink || "";
//       const width = item?.image?.width || 0;
//       const height = item?.image?.height || 0;

//       if (!url || typeof url !== "string") return null;
//       if (!url.startsWith("https://") && !url.startsWith("http://"))
//         return null;
//       if (isDomainBlocked(url)) return null;

//       return { url, thumbnail, title, source, width, height };
//     })
//     .filter(Boolean);

//   // Calculate next page start
//   const nextStart =
//     start + PAGE_SIZE <= Math.min(totalResults, 100) ? start + PAGE_SIZE : null;

//   return Response.json(
//     { results, totalResults, nextStart, currentStart: start },
//     {
//       status: 200,
//       headers: {
//         // Cache for 5 minutes — same query shouldn't re-hit Google
//         "Cache-Control": "private, max-age=300",
//       },
//     },
//   );
// }
// app/api/search-images/route.js
import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

const PAGE_SIZE = 10;

export async function GET(req) {
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  console.log("🔍 Search Request:", { q, uid: requester.uid });

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  console.log("🔑 Env Check:", { 
    hasApiKey: !!apiKey, 
    hasCx: !!cx,
    apiKeyLength: apiKey?.length,
    cx 
  });

  if (!apiKey || !cx) {
    return Response.json({ error: "Missing env variables" }, { status: 503 });
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q,
    searchType: "image",
    num: String(PAGE_SIZE),
    safe: "active",
  });

  const apiUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

  console.log("🌐 Calling Google:", apiUrl.replace(apiKey, "API_KEY_HIDDEN"));

  try {
    const googleRes = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });

    console.log("📡 Google Status:", googleRes.status);

    if (!googleRes.ok) {
      const errorBody = await googleRes.json().catch(() => ({}));
      console.error("❌ Full Google Error:", errorBody);

      return Response.json({
        error: "Google API Error",
        status: googleRes.status,
        details: errorBody?.error?.message || "Unknown error"
      }, { status: googleRes.status });
    }

    const data = await googleRes.json();
    return Response.json({
      results: data.items || [],
      totalResults: data.searchInformation?.totalResults
    });

  } catch (err) {
    console.error("Fetch Error:", err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}