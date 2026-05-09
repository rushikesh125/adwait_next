/**
 * app/api/ai-itinerary-template/route.js
 *
 * Used by ItineraryForm (template creation page).
 * Applies the same role-aware permission check as ai-itinerary/route.js.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Guard — role-aware
// ─────────────────────────────────────────────────────────────────────────────
async function checkItineraryPermission(uid, role) {
  if (!uid) return false;
  if (role === "superadmin") return true;

  const collectionName =
    role === "admin" ? "adminPermissions" : "agentPermissions";

  try {
    const snap = await adminDb.collection(collectionName).doc(uid).get();
    if (!snap.exists) return false;
    return snap.data()?.itinerary_ai === true;
  } catch (err) {
    console.error("[ai-itinerary-template] Permission check failed:", err.code ?? err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────
const DaySchema = z.object({
  id:          z.string(),
  dayNumber:   z.number(),
  title:       z.string(),
  description: z.string(),
  activityIds: z.array(z.string()).optional().default([]),
});

const TemplateResponseSchema = z.object({
  title:     z.string(),
  states:    z.array(z.string()).optional().default([]),
  cities:    z.array(z.string()).optional().default([]),
  startCity: z.string().optional().default(""),
  endCity:   z.string().optional().default(""),
  numDays:   z.number().optional(),
  tags:      z.array(z.string()).optional().default([]),
  days:      z.array(DaySchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Gemini JSON schema (flat, no $ref)
// ─────────────────────────────────────────────────────────────────────────────
const dayGeminiSchema = {
  type: "object",
  properties: {
    id:          { type: "string" },
    dayNumber:   { type: "number" },
    title:       { type: "string" },
    description: { type: "string" },
    activityIds: { type: "array", items: { type: "string" } },
  },
  required: ["id", "dayNumber", "title", "description", "activityIds"],
};

const geminiSchema = {
  type: "object",
  properties: {
    title:     { type: "string" },
    states:    { type: "array", items: { type: "string" } },
    cities:    { type: "array", items: { type: "string" } },
    startCity: { type: "string" },
    endCity:   { type: "string" },
    numDays:   { type: "number" },
    tags:      { type: "array", items: { type: "string" } },
    days:      { type: "array", items: dayGeminiSchema },
  },
  required: ["title", "cities", "startCity", "endCity", "numDays", "days"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────
function buildBasePrompt({ states, cities, startCity, endCity, numDays }) {
  const statesList = states?.length ? states.join(", ") : "India";
  const citiesList = cities?.length ? cities.join(", ") : startCity || "the destination";
  const days       = Number(numDays) > 0 ? numDays : 3;

  return `
You are an expert Indian tour itinerary writer for Adwait Tours.
Generate a complete day-wise itinerary template for an agent to use as a base.
No emojis in any text.

## TRIP CONTEXT
- States: ${statesList}
- Cities covered: ${citiesList}
- Starting city: ${startCity || citiesList.split(",")[0]?.trim() || "first city"}
- Ending city:   ${endCity   || citiesList.split(",").pop()?.trim()  || "last city"}
- Total days:    ${days}

## RULES
- Day 1: Arrival day — transfer from origin to ${startCity || "first city"}, check-in, brief local orientation.
- Intermediate days: Full sightseeing days. Use REAL, well-known attractions for each city.
- Last day: Departure — checkout and transfer from ${endCity || "last city"} back to origin.
- Descriptions: second-person, bullet points using '•' prefix, each bullet on a new line.
- Include meal plan as the last bullet: "Meal Plan: Breakfast / Lunch / Dinner" or "No Meals" on travel days.
- Generate EXACTLY ${days} day objects.
- activityIds: always an empty array [] — the agent links activities manually.
- IDs: short slugs like "day-001", "day-002", etc.

## OUTPUT
Return valid JSON only, matching the schema provided. No markdown, no explanation.
`.trim();
}

function buildRefinementSuffix({ userPrompt, chatHistory, currentItinerary }) {
  const historyText = (chatHistory || [])
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `
## REFINEMENT MODE
Apply ONLY the changes the user requested — keep everything else identical.

### Conversation history
${historyText || "(none)"}

### Current itinerary (what the user sees)
${currentItinerary ? JSON.stringify(currentItinerary, null, 2) : "(not provided — generate fresh)"}

### User request
"${userPrompt}"

Return the FULL updated itinerary JSON. Preserve unchanged day IDs. No explanation.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  // ── 1. Parse body ─────────────────────────────────────────────────────────
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
    templateContext  = {},
    chatHistory      = [],
    userPrompt       = null,
    currentItinerary = null,
  } = body;

  // ── 2. Authenticate ───────────────────────────────────────────────────────
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
      { error: "Authenticated user is required." },
      { status: 401 }
    );
  }

  // ── 3. Permission check — role-aware ──────────────────────────────────────
  const isAllowed = await checkItineraryPermission(requester.uid, requester.role);

  if (!isAllowed) {
    return Response.json(
      {
        error: "You don't have access to AI Itinerary Creation. Please contact your super admin to enable this feature.",
        code:  "PERMISSION_DENIED",
      },
      { status: 403 }
    );
  }

  // ── 4. Rate limit ─────────────────────────────────────────────────────────
  const rl = rateLimit({
    uid:      requester.uid,
    action:   "ai-itinerary-template",
    limit:    10,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait before generating again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // ── 5. Validate templateContext ───────────────────────────────────────────
  const {
    states    = [],
    cities    = [],
    startCity = "",
    endCity   = "",
    numDays,
  } = templateContext;

  if (!Array.isArray(cities) || !Array.isArray(states)) {
    return Response.json(
      { error: "templateContext.cities and templateContext.states must be arrays." },
      { status: 400 }
    );
  }

  const resolvedDays = Number(numDays) > 0 ? Number(numDays) : 3;

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
  const isRefinement =
    typeof userPrompt === "string" && userPrompt.trim().length > 0;

  const basePrompt = buildBasePrompt({
    states,
    cities,
    startCity: startCity.trim(),
    endCity:   endCity.trim(),
    numDays:   resolvedDays,
  });

  const fullPrompt = isRefinement
    ? `${basePrompt}\n\n${buildRefinementSuffix({
        userPrompt:       userPrompt.trim(),
        chatHistory:      safeChatHistory,
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
    return Response.json(
      { error: "Failed to initialise AI service." },
      { status: 503 }
    );
  }

  // ── 9. Call Gemini ────────────────────────────────────────────────────────
  let rawText;
  try {
    const response = await ai.models.generateContent({
      model:    "gemini-2.5-flash-lite",
      contents: fullPrompt,
      config: {
        responseMimeType:   "application/json",
        responseJsonSchema: geminiSchema,
      },
    });
    rawText = response.text;
  } catch (geminiErr) {
    console.error("[ai-itinerary-template] Gemini error:", geminiErr);
    const msg = geminiErr?.message || "";

    if (msg.includes("quota") || msg.includes("429"))
      return Response.json({ error: "AI quota exceeded. Please try again in a moment." }, { status: 429 });
    if (msg.includes("safety") || msg.includes("blocked"))
      return Response.json({ error: "AI blocked this request. Try rephrasing." }, { status: 422 });
    if (msg.includes("deadline") || msg.includes("timeout"))
      return Response.json({ error: "AI took too long to respond. Please try again." }, { status: 504 });

    return Response.json(
      { error: "AI generation failed. Please try again.", details: msg || "Unknown error" },
      { status: 502 }
    );
  }

  // ── 10. Guard empty response ──────────────────────────────────────────────
  if (!rawText?.trim()) {
    return Response.json(
      { error: "AI returned an empty response. Please try again." },
      { status: 502 }
    );
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
    console.error("[ai-itinerary-template] JSON parse failed:", jsonErr.message);
    return Response.json(
      { error: "AI returned malformed data. Please try again.", details: jsonErr.message },
      { status: 422 }
    );
  }

  // ── 13. Validate with Zod ─────────────────────────────────────────────────
  let validated;
  try {
    validated = TemplateResponseSchema.parse(parsed);
  } catch (zodErr) {
    console.error("[ai-itinerary-template] Zod validation failed:", zodErr);
    // Return unvalidated as fallback rather than erroring the user
    return Response.json(parsed, {
      status: 200,
      headers: { "X-Validation-Warning": "Schema validation failed; data may be incomplete." },
    });
  }

  return Response.json(validated, { status: 200 });
}