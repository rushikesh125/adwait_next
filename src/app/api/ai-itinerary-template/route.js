import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Guard
// Checks agentPermissions/{uid}.itinerary_ai === true
// ─────────────────────────────────────────────────────────────────────────────
async function checkItineraryPermission(uid) {
  if (!uid) return false;
  try {
    const snap = await adminDb.collection("agentPermissions").doc(uid).get();
    if (!snap.exists) return false;
    return snap.data()?.itinerary_ai === true;
  } catch (err) {
    console.error("[ai-itinerary-template] Permission check failed:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema — validation only
// ─────────────────────────────────────────────────────────────────────────────
const DaySchema = z.object({
  id: z.string(),
  dayNumber: z.number(),
  title: z.string(),
  description: z.string(),
  activityIds: z.array(z.string()),
});

const TemplateItineraryResponseSchema = z.object({
  title: z.string(),
  states: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  startCity: z.string().optional(),
  endCity: z.string().optional(),
  numDays: z.number().optional(),
  days: z.array(DaySchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Gemini JSON Schema (flat, no $ref)
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
    states: { type: "array", items: { type: "string" } },
    cities: { type: "array", items: { type: "string" } },
    startCity: { type: "string" },
    endCity: { type: "string" },
    numDays: { type: "number" },
    days: { type: "array", items: daySchema },
  },
  required: ["title", "states", "cities", "startCity", "endCity", "numDays", "days"],
};
// ─────────────────────────────────────────────────────────────────────────────
// Base Prompt Builder
// Context: template creation — no package/booking context, purely geographic
// ─────────────────────────────────────────────────────────────────────────────
function buildBasePrompt({ states, cities, startCity, endCity, numDays }) {
  const hasContext = states.length > 0 || cities.length > 0 || startCity || endCity || numDays >= 1;
  const statesList = states.length > 0 ? states.join(", ") : null;
  const citiesList = cities.length > 0 ? cities.join(", ") : null;

  const contextSection = hasContext
    ? `
## TRIP DETAILS (provided by user — use these exactly)
${statesList ? `- Base State(s): ${statesList}` : ""}
${citiesList ? `- Cities Covered: ${citiesList}` : ""}
${startCity ? `- Starting City: ${startCity}` : ""}
${endCity ? `- Ending City: ${endCity}` : ""}
${numDays >= 1 ? `- Total Days: ${numDays}` : ""}
`.trim()
    : `
## TRIP DETAILS
No specific trip details were provided. You will infer a suitable Indian tour destination and create a complete itinerary for it.
Choose a popular Indian destination (e.g. Rajasthan, Kerala Backwaters, Himachal Pradesh, etc.) and decide:
- The states, cities, start city, end city, and number of days.
- Return these in your JSON response so the form can be auto-filled.
`.trim();

  return `
You are an expert Indian tour itinerary writer for Adwait Tours.
Generate a complete, detailed, day-wise tour itinerary (title + days array + destination metadata).
Do NOT generate inclusions, exclusions, T&C, cancellation policy, or important information — those are managed separately.
No emojis in any text.

${contextSection}

## ITINERARY RULES (follow strictly)

### Day 1 — Arrival / Start
- First day always starts in the starting city.
- Covers arrival orientation, hotel check-in, and any afternoon sightseeing if time permits.
- Mention meal plan at end of day (typically "No Meals" on arrival day).

### Intermediate Days — Sightseeing
- Use REAL, well-known attractions for each city.
- Transition day when moving between cities: morning checkout + drive + afternoon sightseeing + check-in.
- Mention meal timings: Breakfast ~8AM, Lunch ~1PM, Dinner ~8PM.
- Include approximate timings for each activity (e.g. "09:00 AM – Visit Amber Fort").
- Distribute cities logically across the days; do not cram all cities into one day.

### Last Day — Departure
- Final day ends in the ending city.
- Morning checkout. If time allows before departure: one short activity (max 2 hrs).
- Meal plan: typically "No Meals" on departure day.

### General Rules
- Write descriptions in second-person ("proceed to...", "enjoy...", "check in at...").
- Use bullet points with '•' prefix for each activity/step, each on its own line.
- Include meal plan as the final bullet of each day description: "• Meal Plan: [Breakfast / Lunch / Dinner / No Meals]"
- Be specific with approximate timings.
- Keep language simple, friendly, and informative.

## OUTPUT FORMAT
Return valid JSON matching the provided schema exactly.
- title: a descriptive itinerary title (e.g. "5N6D Rajasthan Heritage Circuit")
- states: array of Indian state names covered (e.g. ["Rajasthan"])
- cities: array of all cities visited in order (e.g. ["Jaipur", "Jodhpur", "Udaipur"])
- startCity: the first city of the trip
- endCity: the last city of the trip
- numDays: total number of days as an integer
- days[].id: short slugs like "day-001", "day-002", etc.
- days[].dayNumber: integer starting at 1
- days[].title: short evocative title for the day (e.g. "Arrival in Jaipur")
- days[].description: full day description using bullet points starting with '•', each on a new line
- days[].activityIds: always an empty array []
- Do NOT include inclusions, exclusions, tnc, cancellation, impInfo, or tags.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Refinement Prompt Suffix
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
The user has already seen a generated itinerary and wants specific changes.
Apply ONLY the changes requested — keep everything else identical.

### Conversation History (for context)
${historyText || "(no prior conversation)"}

### Current Itinerary State (JSON — what the user currently sees)
${itinerarySnapshot ?? "(not provided — generate fresh)"}

### Latest User Request
"${userPrompt}"

## INSTRUCTIONS FOR REFINEMENT
- Read the current itinerary carefully before making any changes.
- Apply ONLY what the user asked for. Do not alter unrelated days or content.
- Return the FULL updated itinerary JSON (not a diff) — the client replaces its state with what you return.
- Preserve existing IDs where content is unchanged. Use new short slug IDs only for newly added days.
- Do NOT acknowledge, explain, or add any text outside the JSON.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler  POST /api/ai-itinerary-template
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  // ── 1. Parse body ─────────────────────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  const {
    templateContext,        // { states, cities, startCity, endCity, numDays }
    chatHistory = [],
    userPrompt = null,
    currentItinerary = null,
  } = body;

  // ── 2. Auth ───────────────────────────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 401 });
  }

  if (!requester.uid) {
    return Response.json({ error: "Authenticated user required." }, { status: 401 });
  }

  // ── 3. Permission check ───────────────────────────────────────────────────
  const isAllowed = await checkItineraryPermission(requester.uid);
  if (!isAllowed) {
    return Response.json(
      {
        error: "You don't have access to AI Itinerary Creation. Please contact your admin.",
        code: "PERMISSION_DENIED",
      },
      { status: 403 }
    );
  }

  // ── 4. Rate limit — 10 per minute ────────────────────────────────────────
  const rl = rateLimit({
    uid: requester.uid,
    action: "ai-itinerary-template",
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a moment before generating again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // ── 5. Validate templateContext ───────────────────────────────────────────
  if (!templateContext) {
    return Response.json({ error: "templateContext is required." }, { status: 400 });
  }

  const {
    states = [],
    cities = [],
    startCity = "",
    endCity = "",
    numDays = 0,
  } = templateContext;

// Fields are optional — AI will infer them from user prompts if not provided

  // ── 6. Sanitise chatHistory ───────────────────────────────────────────────
  const safeChatHistory = Array.isArray(chatHistory)
    ? chatHistory.filter(
        (m) =>
          m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
    : [];

  // ── 7. Build prompt ───────────────────────────────────────────────────────
  const isRefinement = typeof userPrompt === "string" && userPrompt.trim().length > 0;

  const basePrompt = buildBasePrompt({ states, cities, startCity, endCity, numDays });

  const fullPrompt = isRefinement
    ? `${basePrompt}\n\n${buildRefinementSuffix({
        userPrompt: userPrompt.trim(),
        chatHistory: safeChatHistory,
        currentItinerary,
      })}`
    : basePrompt;

  // ── 8. Init Gemini ────────────────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.error("[ai-itinerary-template] GEMINI_API_KEY not set.");
    return Response.json(
      { error: "AI service is not configured. Please contact support." },
      { status: 503 }
    );
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (initErr) {
    console.error("[ai-itinerary-template] Failed to init GoogleGenAI:", initErr);
    return Response.json({ error: "Failed to initialise AI service." }, { status: 503 });
  }

  // ── 9. Call Gemini ────────────────────────────────────────────────────────
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
    console.error("[ai-itinerary-template] Gemini API error:", geminiErr);
    const msg = geminiErr?.message || "";
    if (msg.includes("quota") || msg.includes("429")) {
      return Response.json({ error: "AI quota exceeded. Please try again in a moment." }, { status: 429 });
    }
    if (msg.includes("safety") || msg.includes("blocked")) {
      return Response.json(
        { error: "The AI blocked this request due to content policy. Try rephrasing." },
        { status: 422 }
      );
    }
    if (msg.includes("deadline") || msg.includes("timeout")) {
      return Response.json({ error: "AI took too long to respond. Please try again." }, { status: 504 });
    }
    return Response.json(
      { error: "AI generation failed. Please try again.", details: msg || "Unknown error" },
      { status: 502 }
    );
  }

  // ── 10. Guard empty response ──────────────────────────────────────────────
  if (!rawText?.trim()) {
    return Response.json({ error: "AI returned an empty response. Please try again." }, { status: 502 });
  }

  // ── 11. Strip markdown fences ─────────────────────────────────────────────
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── 12. Parse JSON ────────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (jsonErr) {
    console.error("[ai-itinerary-template] JSON parse failed:", jsonErr);
    console.error("[ai-itinerary-template] Raw output (first 500):", rawText.slice(0, 500));
    return Response.json(
      { error: "AI returned malformed data. Please try again.", details: `JSON parse error: ${jsonErr.message}` },
      { status: 422 }
    );
  }

  // ── 13. Validate with Zod ─────────────────────────────────────────────────
  let validated;
  try {
    validated = TemplateItineraryResponseSchema.parse(parsed);
  } catch (zodErr) {
    console.error("[ai-itinerary-template] Zod validation failed:", zodErr);
    // Return unvalidated as fallback — better than a hard error
    return Response.json(parsed, {
      status: 200,
      headers: { "X-Validation-Warning": "Schema validation failed; data may be incomplete." },
    });
  }

  return Response.json(validated, { status: 200 });
}