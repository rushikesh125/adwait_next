import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Guard Helper
// Checks agentPermissions/{uid}.itinerary_ai === true before proceeding.
// ─────────────────────────────────────────────────────────────────────────────
async function checkItineraryPermission(uid) {
  if (!uid) return false;
  try {
    const snap = await adminDb.collection("agentPermissions").doc(uid).get();
    if (!snap.exists) return false;
    return snap.data()?.itinerary_ai === true;
  } catch (err) {
    console.error("[ai-itinerary] Permission check failed:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas — validation only, NOT passed to Gemini
// ─────────────────────────────────────────────────────────────────────────────
const DaySchema = z.object({
  id: z.string(),
  dayNumber: z.number(),
  title: z.string(),
  description: z.string(),
  activityIds: z.array(z.string()),
});

const ItineraryResponseSchema = z.object({
  title: z.string(),
  state: z.string(),
  cities: z.array(z.string()),
  tags: z.array(z.string()),
  days: z.array(DaySchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Flat JSON schema — passed to Gemini (no $ref, fully inlined)
// ─────────────────────────────────────────────────────────────────────────────
const daySchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    dayNumber: { type: "number" },
    title: { type: "string" },
    description: { type: "string" },
    activityIds: { type: "array", items: { type: "string" } },
  },
  required: ["id", "dayNumber", "title", "description", "activityIds"],
};

const geminiSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    state: { type: "string" },
    cities: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    days: { type: "array", items: daySchema },
  },
  required: ["title", "state", "cities", "tags", "days"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Base prompt builder
// ─────────────────────────────────────────────────────────────────────────────
function buildBasePrompt({
  origin,
  destination,
  cities,
  numDays,
  transport,
  arrivalTime,
  departureTime,
  additionalContext,
}) {
  const citiesList = cities.length > 0 ? cities.join(", ") : destination;

  return `
You are an expert Indian tour itinerary writer for Adwait Tours.
Generate a complete, detailed, day-wise tour itinerary strictly following the rules below.
note : no emojies is text 
## TRIP DETAILS
- Origin: ${origin}
- Destination(s): ${citiesList}
- Total Days: ${numDays}
- Transport Mode: ${transport}
${arrivalTime ? `- Check-in Date:  ${arrivalTime}` : ""}
${departureTime ? `- Check-out Date: ${departureTime}` : ""}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

## ITINERARY RULES (follow strictly)

### Day 1 — Arrival
- Always the first day. Covers travel from ${origin} to first destination.
- Pickup from airport/railway station upon arrival → transfer to hotel → check-in.
- If arrival before 12:00 PM: include a nearby attraction or local orientation in the afternoon.
- If arrival after 4:00 PM: check-in and rest only. No sightseeing.
- Mention meal plan (typically "No Meals" on travel days).

### Intermediate Days — Sightseeing
- One full day per city. Use REAL, well-known attractions for each city.
- Transition day (moving city to city): morning checkout + drive to next city + afternoon sightseeing + check-in.
- Mention meal timings naturally: Breakfast ~8AM, Lunch ~1PM, Dinner ~8PM.
- Include approximate timings for each activity.

### Last Day — Departure
- Morning checkout. If departure after 12 PM: one short activity (max 2 hrs) before transfer.
- If departure before 8 AM: checkout and direct transfer only — no activities.
- Transfer back via ${transport}.
- Meal plan: typically "No Meals" on travel days.

### General Rules
- Write descriptions in second-person ("proceed to...", "enjoy...", "check in at...").
- Use bullet points with '•' prefix for each activity/step, starting each on a new line.
- Include meal plan at the end of each day: " Meal Plan: [Breakfast / Lunch / Dinner / No Meals]"
- Be specific about timings (approximate is fine).
- Vehicle type is "${transport}" — mention it naturally in transfer descriptions.
- Generate EXACTLY ${numDays} day objects in the days array.

## OUTPUT FORMAT
Return valid JSON matching the provided schema exactly.
- IDs: use short slugs like "day-001", "day-002", etc.
- Keep language simple and friendly.
- Day descriptions: start each bullet point on a new line.
- Include day-wise meals for each day as a final bullet point in the description 

`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Refinement prompt suffix
// ─────────────────────────────────────────────────────────────────────────────
function buildRefinementSuffix({ userPrompt, chatHistory, currentItinerary }) {
  const historyText = chatHistory
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const itinerarySnapshot = currentItinerary
    ? JSON.stringify(currentItinerary, null, 2)
    : null;

  return `
## REFINEMENT MODE
The user has already seen an itinerary and wants specific changes.
Apply ONLY the changes requested — keep everything else the same.

### Conversation History (for context)
${historyText || "(no prior conversation)"}

### Current Itinerary State (JSON — what the user currently sees)
${itinerarySnapshot ? itinerarySnapshot : "(not provided — generate fresh)"}

### Latest User Request
"${userPrompt}"

## INSTRUCTIONS FOR REFINEMENT
- Read the current itinerary carefully.
- Apply ONLY what the user asked for above. Do not change things unrelated to the request.
- If the user asks to change Day 2, only update Day 2 (keep other days identical).
- Return the FULL updated itinerary JSON (not a diff) — the client will replace state with what you return.
- Preserve all existing IDs where the content is unchanged. Use new short slug IDs only for newly added items.
- Do NOT acknowledge or explain — return JSON only.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  // ── 1. Parse request body ─────────────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const {
    packageContext,
    chatHistory = [],
    userPrompt = null,
    currentItinerary = null,
  } = body;

  // ── 2. Permission check — BEFORE any AI call ──────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: error.status || 401 }
    );
  }

  if (!requester.uid) {
    return Response.json(
      { error: "Authenticated user is required to verify access." },
      { status: 401 }
    );
  }

  const isAllowed = await checkItineraryPermission(requester.uid);
  if (!isAllowed) {
    return Response.json(
      {
        error:
          "You don't have access to AI Itinerary Creation. Please contact your admin to enable this feature.",
        code: "PERMISSION_DENIED",
      },
      { status: 403 }
    );
  }

  // ── 3. Validate required fields ───────────────────────────────────────────
  if (!packageContext) {
    return Response.json(
      { error: "packageContext is required." },
      { status: 400 }
    );
  }

  const safeChatHistory = Array.isArray(chatHistory)
    ? chatHistory.filter(
        (m) =>
          m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
    : [];

  // ── 4. Destructure packageContext ─────────────────────────────────────────
  const {
    hotelEntries = [],
    selectedTransport = null,
    selectedActivities = [],
    selectedState = "",
    checkInDate = "",
    checkOutDate = "",
    packageName = "",
    customerName = "",
  } = packageContext;

  // ── 5. Derive cities & destination ────────────────────────────────────────
  const cities = [...new Set(hotelEntries.map((e) => e.city).filter(Boolean))];
  const destination = cities[0] || selectedState || null;

  if (!destination) {
    return Response.json(
      {
        error:
          "Could not determine destination. Please add at least one hotel.",
      },
      { status: 400 }
    );
  }

  // ── 6. Derive numDays ─────────────────────────────────────────────────────
  const totalNights = hotelEntries.reduce(
    (sum, e) => sum + (Number(e.nights) || 0),
    0
  );
  const numDays = totalNights > 0 ? totalNights + 1 : 3;

  // ── 7. Derive transport mode ──────────────────────────────────────────────
  const vehicleType = selectedTransport?.selectedVehicle?.type || "";
  const vehicleLower = vehicleType.toLowerCase();
  const transport = vehicleLower.includes("train")
    ? "train"
    : vehicleLower.includes("flight")
    ? "flight"
    : vehicleLower.includes("bus")
    ? "bus"
    : vehicleType || "private car";

  // ── 8. Origin ─────────────────────────────────────────────────────────────
  const origin = selectedState || "Origin City";

  // ── 9. Additional context string ──────────────────────────────────────────
  const hotelLines = hotelEntries
    .map((e) =>
      [e.hotel, e.city, e.nights ? `${e.nights}N` : null, e.selectedMealPlan]
        .filter(Boolean)
        .join(" | ")
    )
    .join("; ");

  const activityNames = selectedActivities
    .map((a) => a.name)
    .filter(Boolean)
    .join(", ");

  const additionalContext = [
    hotelLines ? `Hotels: ${hotelLines}` : null,
    activityNames ? `Activities: ${activityNames}` : null,
    packageName ? `Package: ${packageName}` : null,
    customerName ? `Customer: ${customerName}` : null,
    vehicleType ? `Vehicle: ${vehicleType}` : null,
    selectedTransport?.name
      ? `Transport package: ${selectedTransport.name}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  // ── 10. Determine refinement vs fresh generation ──────────────────────────
  const isRefinement =
    typeof userPrompt === "string" && userPrompt.trim().length > 0;

  // ── 11. Build prompt ──────────────────────────────────────────────────────
  const basePrompt = buildBasePrompt({
    origin,
    destination,
    cities,
    numDays,
    transport,
    arrivalTime: checkInDate || undefined,
    departureTime: checkOutDate || undefined,
    additionalContext: additionalContext || undefined,
  });

  const fullPrompt = isRefinement
    ? `${basePrompt}\n\n${buildRefinementSuffix({
        userPrompt: userPrompt.trim(),
        chatHistory: safeChatHistory,
        currentItinerary,
      })}`
    : basePrompt;

  // ── 12. Init Gemini ───────────────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.error("[ai-itinerary] GEMINI_API_KEY is not set.");
    return Response.json(
      { error: "AI service is not configured. Please contact support." },
      { status: 503 }
    );
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (initErr) {
    console.error("[ai-itinerary] Failed to init GoogleGenAI:", initErr);
    return Response.json(
      { error: "Failed to initialise AI service." },
      { status: 503 }
    );
  }

  // ── 13. Call Gemini ───────────────────────────────────────────────────────
  let rawText;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: geminiSchema,
      },
    });
    rawText = response.text;
  } catch (geminiErr) {
    console.error("[ai-itinerary] Gemini API error:", geminiErr);

    const msg = geminiErr?.message || "";
    if (msg.includes("quota") || msg.includes("429")) {
      return Response.json(
        { error: "AI quota exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }
    if (msg.includes("safety") || msg.includes("blocked")) {
      return Response.json(
        {
          error:
            "The AI blocked this request due to content policy. Try rephrasing your request.",
        },
        { status: 422 }
      );
    }
    if (msg.includes("deadline") || msg.includes("timeout")) {
      return Response.json(
        { error: "The AI took too long to respond. Please try again." },
        { status: 504 }
      );
    }

    return Response.json(
      {
        error: "AI generation failed. Please try again.",
        details: msg || "Unknown Gemini error",
      },
      { status: 502 }
    );
  }

  // ── 14. Guard empty response ──────────────────────────────────────────────
  if (!rawText || !rawText.trim()) {
    console.error("[ai-itinerary] Gemini returned empty text.");
    return Response.json(
      { error: "AI returned an empty response. Please try again." },
      { status: 502 }
    );
  }

  // ── 15. Strip markdown fences ─────────────────────────────────────────────
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── 16. Parse JSON ────────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (jsonErr) {
    console.error("[ai-itinerary] JSON parse failed:", jsonErr);
    console.error(
      "[ai-itinerary] Raw output (first 500 chars):",
      rawText.slice(0, 500)
    );
    return Response.json(
      {
        error: "AI returned malformed data. Please try again.",
        details: `JSON parse error: ${jsonErr.message}`,
      },
      { status: 422 }
    );
  }

  // ── 17. Validate with Zod ─────────────────────────────────────────────────
  let validated;
  try {
    validated = ItineraryResponseSchema.parse(parsed);
  } catch (zodErr) {
    console.error("[ai-itinerary] Zod validation failed:", zodErr);
    console.warn(
      "[ai-itinerary] Returning unvalidated parsed data as fallback."
    );
    return Response.json(parsed, {
      status: 200,
      headers: {
        "X-Validation-Warning":
          "Schema validation failed; data may be incomplete.",
      },
    });
  }

  return Response.json(validated, { status: 200 });
}
