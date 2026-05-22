import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { adminDb } from "@/firebase/admin";
import { requireAuthenticatedUser } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

// ─────────────────────────────────────────────────────────────────────────────
// Permission Guard Helper
//
// Role routing:
//   superadmin → always allowed (no Firestore read)
//   admin      → reads adminPermissions/{uid}
//   agent      → reads agentPermissions/{uid}
//   unknown    → reads agentPermissions/{uid}  (safe default)
// ─────────────────────────────────────────────────────────────────────────────
async function checkItineraryPermission(uid, role) {
  if (!uid) return false;

  // Superadmin always has full access
  if (role === "superadmin") return true;

  // Route to the correct collection based on role
  const collectionName =
    role === "admin" ? "adminPermissions" : "agentPermissions";

  try {
    const snap = await adminDb.collection(collectionName).doc(uid).get();
    if (!snap.exists) return false;
    return snap.data()?.itinerary_ai === true;
  } catch (err) {
    console.error("[ai-itinerary] Permission check failed:", err.code ?? err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas — validation only, NOT passed to Gemini
// ─────────────────────────────────────────────────────────────────────────────
const DaySchema = z.object({
  id:          z.string(),
  dayNumber:   z.number(),
  title:       z.string(),
  description: z.string(),
  activityIds: z.array(z.string()),
});

const ItineraryResponseSchema = z.object({
  title:  z.string(),
  state:  z.string(),
  cities: z.array(z.string()),
  tags:   z.array(z.string()),
  days:   z.array(DaySchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Flat JSON schema — passed to Gemini (no $ref, fully inlined)
// ─────────────────────────────────────────────────────────────────────────────
const daySchema = {
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
    title:  { type: "string" },
    state:  { type: "string" },
    cities: { type: "array", items: { type: "string" } },
    tags:   { type: "array", items: { type: "string" } },
    days:   { type: "array", items: daySchema },
  },
  required: ["title", "state", "cities", "tags", "days"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily meal plan map builder
// ─────────────────────────────────────────────────────────────────────────────
// Each hotel entry has selectedMealPlan ∈ { EP, CP, MAP, AP }. We allocate
// meals per *day* (not per night), modelling how guests actually consume them:
//
//   For each hotel night N (arrival day = N):
//     EP  → nothing
//     CP  → Breakfast on day N+1 (morning after)
//     MAP → Dinner on day N, Breakfast on day N+1
//     AP  → Lunch + Dinner on day N, Breakfast on day N+1
//
// Examples:
//   1N MAP →  Day 1: Dinner | Day 2: Breakfast
//   1N AP  →  Day 1: Lunch and Dinner | Day 2: Breakfast
//   2N AP  →  Day 1: Lunch and Dinner | Day 2: Breakfast, Lunch and Dinner | Day 3: Breakfast
function buildDailyMealMap(hotelEntries = [], numDays = 0) {
  if (numDays <= 0) return "";
  // Per-day meal slots
  const meals = Array.from({ length: numDays }, () => ({
    breakfast: false,
    lunch: false,
    dinner: false,
    hotel: null,
    city: null,
  }));

  let day = 1;
  for (const h of hotelEntries) {
    const nights = Number(h.nights) || 0;
    const code = (h.selectedMealPlan || "EP").toUpperCase();
    const hasBreakfast = ["CP", "MAP", "AP"].includes(code);
    const hasLunch     = code === "AP";
    const hasDinner    = ["MAP", "AP"].includes(code);

    for (let i = 0; i < nights; i++) {
      const tonight  = day;     // 1-based day of arrival to this night's hotel
      const tomorrow = day + 1; // morning after sleeping

      if (tonight <= numDays) {
        if (!meals[tonight - 1].hotel) meals[tonight - 1].hotel = h.hotel;
        if (!meals[tonight - 1].city)  meals[tonight - 1].city  = h.city;
        // AP "starts with Lunch" — included on the arrival day along with Dinner.
        if (hasLunch)  meals[tonight - 1].lunch  = true;
        if (hasDinner) meals[tonight - 1].dinner = true;
      }
      if (tomorrow <= numDays) {
        if (hasBreakfast) meals[tomorrow - 1].breakfast = true;
      }
      day++;
    }
  }

  // Format: "Breakfast", "Breakfast and Dinner", "Breakfast, Lunch and Dinner"
  const labelFor = (m) => {
    const parts = [];
    if (m.breakfast) parts.push("Breakfast");
    if (m.lunch)     parts.push("Lunch");
    if (m.dinner)    parts.push("Dinner");
    if (parts.length === 0) return "No Meals";
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  };
  const lines = meals.map((m, idx) => {
    const dayNum = idx + 1;
    const where  = m.hotel
      ? `Stay at ${m.hotel}${m.city ? ` (${m.city})` : ""}`
      : (dayNum === numDays ? "Departure" : "");
    const prefix = where ? `${where} — ` : "";
    return `Day ${dayNum}: ${prefix}Meal Plan: ${labelFor(m)}`;
  });
  return lines.join("\n");
}

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
  dailyMealMap,
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
${arrivalTime   ? `- Check-in Date:  ${arrivalTime}`   : ""}
${departureTime ? `- Check-out Date: ${departureTime}` : ""}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

## DAILY MEAL PLAN MAP (CRITICAL — use these EXACTLY)
The agent has already booked these hotels with these meal plans. For each
day's "Meal Plan:" bullet you MUST use the value from this map verbatim.
DO NOT invent meals, do not "round up", do not infer based on the time of day.

${dailyMealMap || "(No hotel context available — use 'No Meals' as the default.)"}

Meal plan decoding (FYI, already applied in the map above):
- EP  = No Meals
- CP  = Breakfast
- MAP = Breakfast and Dinner
- AP  = Breakfast, Lunch and Dinner

## ITINERARY RULES (follow strictly)

### Pacing — IMPORTANT
This itinerary should be **fast-paced and packed**. Pack each day with the MAXIMUM number of well-known sightseeing places that realistically fit in the available hours. Customers want value for their time — assume they're willing to be active 8–10 hours per sightseeing day. Group nearby attractions together to minimise transit overhead, and chain visits efficiently (e.g. morning palace → nearby museum → lunch → afternoon temple → evening viewpoint). Don't pad days with "free time" or "rest at hotel" unless it's the arrival/departure day or after a very long drive. Aim for **4–6 sightseeing places on each full sightseeing day** (more if the city has many close-together attractions), respecting their realistic durations.

### Day 1 — Arrival
- Always the first day. Covers travel from ${origin} to first destination.
- Pickup from airport/railway station upon arrival → transfer to hotel → check-in.
- **Include approximate distance (in km) and travel time** for the airport/station-to-hotel transfer, e.g. "approximately 35 km · 1 hr drive".
- If arrival before 12:00 PM: fit in 2–3 nearby attractions in the afternoon and evening (don't leave the rest of the day empty).
- If arrival 12 PM – 4 PM: include at least 1–2 nearby attractions before/around dinner.
- If arrival after 4:00 PM: at minimum, include a short evening orientation walk or local market visit if feasible — otherwise check-in and rest.
- Use the Meal Plan for Day 1 from the map above — do not assume "No Meals".

### Intermediate Days — Sightseeing (PACK THEM)
- Full sightseeing days: aim for **4–6 well-known attractions per day**. Use REAL attractions for each city. Mix top sights with lesser-known but interesting spots if the city is well-covered by majors.
- Transition day (moving city to city): morning checkout + drive to next city + at least 2–3 afternoon/evening attractions in the new city + check-in. Do NOT leave a transition day empty after arriving.
- **Whenever travelling from one city to another, ALWAYS state the approximate distance (in km) AND the typical travel time** by ${transport}. Format example: "Drive from Mysore to Ooty — approximately 125 km · 4 hrs by road." Place this as the FIRST sub-bullet under the transit/drive activity.
- For long drives (> 4 hrs), mention a meal/refreshment break en route.
- Mention meal timings naturally: Breakfast ~8AM, Lunch ~1PM, Dinner ~8PM (but only describe the meals actually included per the map).
- Include approximate timings for each activity. Use realistic transit time between attractions so the day is feasible but tightly chained.

### Last Day — Departure
- Morning checkout. Before departure, fit in 1–2 quick attractions or a local market/breakfast spot if time permits.
- If departure 12 PM – 4 PM: include a half-day activity before the airport/station transfer.
- If departure before 8 AM: checkout and direct transfer only — no activities.
- Transfer back via ${transport}.
- **Include approximate distance (in km) and travel time** for the hotel-to-airport/station transfer.
- Use the Meal Plan for the departure day from the map above.

### City-to-City Travel Format (REQUIRED whenever moving between cities)
Always present the inter-city movement with this format as the first line of the transit activity:

• Morning: Check out from your Mysore hotel and drive to Ooty.
  – Distance: approximately 125 km · 4 hrs by ${transport}
  – Scenic route through the Western Ghats; brief refreshment stop en route
• Afternoon: Arrive in Ooty, check into your hotel.

Use realistic distances based on actual road geography. If you don't know the precise figure, give a sensible approximation and clearly note it as approximate.

### General Rules
- Write descriptions in second-person ("proceed to...", "enjoy...", "check in at...").
- Use bullet points with '•' prefix for each activity/step, starting each on a new line.
- **Sightseeing places MUST be listed as sub-bullets under their parent activity**, indented by TWO SPACES and prefixed with "– " (en-dash + space). This makes attractions easy to scan.
- **Every sightseeing sub-bullet MUST include BOTH:**
  - A duration estimate in parentheses immediately after the place name, like "(~2 hrs)" or "(~45 min)". This helps customers gauge time at each spot.
  - A short one-line descriptor (3–8 words) explaining what to expect there, separated by an em-dash (—).
- Include meal plan at the end of each day: "Meal Plan: <value from the DAILY MEAL PLAN MAP for that day>"
- Be specific about timings (approximate is fine).
- Vehicle type is "${transport}" — mention it naturally in transfer descriptions.
- Generate EXACTLY ${numDays} day objects in the days array.

### Sightseeing Sub-bullet Example (REQUIRED FORMAT)
For any activity that involves visiting attractions, list each attraction as a sub-bullet using the exact format:
  – <Place Name> (~<duration>) — <3–8 word descriptor of what to expect>

Example:

• Morning: Begin your Mysore sightseeing tour after breakfast.
  – Mysore Palace (~2 hrs) — iconic Indo-Saracenic royal residence
  – Chamundi Hills (~1.5 hrs) — hilltop temple, panoramic city views
  – Brindavan Gardens (~1 hr) — illuminated musical fountain at dusk
• Lunch at a local restaurant (~1:00 PM).
• Evening: Return to hotel and rest.
• Meal Plan: Breakfast and Dinner

Do NOT inline the attractions in prose (e.g. "visit Mysore Palace, Chamundi Hills, and Brindavan Gardens"). Always break them out as sub-bullets so each attraction is on its own line.

Use realistic durations (e.g. major temples & palaces 1.5–2 hrs, viewpoints 30–45 min, gardens 1 hr, museums 1–2 hrs). For attractions you're unsure about, prefer "~1 hr" as a safe default rather than skipping it.

## OUTPUT FORMAT
Return valid JSON matching the provided schema exactly.
- IDs: use short slugs like "day-001", "day-002", etc.
- Keep language simple and friendly.
- Day descriptions: start each bullet point on a new line.
- Sightseeing attractions: ALWAYS as indented sub-bullets in the exact format "  – <Place> (~<duration>) — <descriptor>".
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
    chatHistory    = [],
    userPrompt     = null,
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
      { error: "Authenticated user is required to verify access." },
      { status: 401 }
    );
  }

  // ── 3. Permission check — role-aware, reads correct collection ────────────
  // NOTE: Do NOT return early here. checkItineraryPermission() returns a
  // boolean; only block if it's false. Admins read from adminPermissions
  // and still need the permission explicitly granted by superadmin.
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

  // ── 4. Rate limit — 10 generations per minute per user ───────────────────
  const rl = rateLimit({
    uid:      requester.uid,
    action:   "ai-itinerary",
    limit:    10,
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

  // ── 5. Validate required fields ───────────────────────────────────────────
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

  // ── 6. Destructure packageContext ─────────────────────────────────────────
  const {
    hotelEntries      = [],
    selectedTransport = null,
    selectedActivities = [],
    selectedState     = "",
    checkInDate       = "",
    checkOutDate      = "",
    packageName       = "",
    customerName      = "",
  } = packageContext;

  // ── 7. Derive cities & destination ───────────────────────────────────────
  const cities      = [...new Set(hotelEntries.map((e) => e.city).filter(Boolean))];
  const destination = cities[0] || selectedState || null;

  if (!destination) {
    return Response.json(
      { error: "Could not determine destination. Please add at least one hotel." },
      { status: 400 }
    );
  }

  // ── 8. Derive numDays ─────────────────────────────────────────────────────
  const totalNights = hotelEntries.reduce(
    (sum, e) => sum + (Number(e.nights) || 0),
    0
  );
  const numDays = totalNights > 0 ? totalNights + 1 : 3;

  // ── 9. Derive transport mode ──────────────────────────────────────────────
  const vehicleType  = selectedTransport?.selectedVehicle?.type || "";
  const vehicleLower = vehicleType.toLowerCase();
  const transport    = vehicleLower.includes("train")
    ? "train"
    : vehicleLower.includes("flight")
    ? "flight"
    : vehicleLower.includes("bus")
    ? "bus"
    : vehicleType || "private car";

  // ── 10. Origin ────────────────────────────────────────────────────────────
  const origin = selectedState || "Origin City";

  // ── 11. Additional context string ─────────────────────────────────────────
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
    hotelLines    ? `Hotels: ${hotelLines}`                           : null,
    activityNames ? `Activities: ${activityNames}`                    : null,
    packageName   ? `Package: ${packageName}`                         : null,
    customerName  ? `Customer: ${customerName}`                       : null,
    vehicleType   ? `Vehicle: ${vehicleType}`                         : null,
    selectedTransport?.name ? `Transport package: ${selectedTransport.name}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  // ── 12. Determine refinement vs fresh generation ──────────────────────────
  const isRefinement =
    typeof userPrompt === "string" && userPrompt.trim().length > 0;

  // ── 13. Build prompt ──────────────────────────────────────────────────────
  const dailyMealMap = buildDailyMealMap(hotelEntries, numDays);
  const basePrompt = buildBasePrompt({
    origin,
    destination,
    cities,
    numDays,
    transport,
    arrivalTime:       checkInDate   || undefined,
    departureTime:     checkOutDate  || undefined,
    additionalContext: additionalContext || undefined,
    dailyMealMap,
  });

  const fullPrompt = isRefinement
    ? `${basePrompt}\n\n${buildRefinementSuffix({
        userPrompt:       userPrompt.trim(),
        chatHistory:      safeChatHistory,
        currentItinerary,
      })}`
    : basePrompt;

  // ── 14. Init Gemini ───────────────────────────────────────────────────────
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

  // ── 15. Call Gemini ───────────────────────────────────────────────────────
  let rawText;
  try {
    const response = await ai.models.generateContent({
      model:   "gemini-2.5-flash-lite",
      contents: fullPrompt,
      config: {
        responseMimeType:   "application/json",
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
        { error: "The AI blocked this request due to content policy. Try rephrasing your request." },
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
        error:   "AI generation failed. Please try again.",
        details: msg || "Unknown Gemini error",
      },
      { status: 502 }
    );
  }

  // ── 16. Guard empty response ──────────────────────────────────────────────
  if (!rawText || !rawText.trim()) {
    console.error("[ai-itinerary] Gemini returned empty text.");
    return Response.json(
      { error: "AI returned an empty response. Please try again." },
      { status: 502 }
    );
  }

  // ── 17. Strip markdown fences ─────────────────────────────────────────────
  const cleanedText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── 18. Parse JSON ────────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (jsonErr) {
    console.error("[ai-itinerary] JSON parse failed:", jsonErr);
    console.error("[ai-itinerary] Raw output (first 500 chars):", rawText.slice(0, 500));
    return Response.json(
      {
        error:   "AI returned malformed data. Please try again.",
        details: `JSON parse error: ${jsonErr.message}`,
      },
      { status: 422 }
    );
  }

  // ── 19. Validate with Zod ─────────────────────────────────────────────────
  let validated;
  try {
    validated = ItineraryResponseSchema.parse(parsed);
  } catch (zodErr) {
    console.error("[ai-itinerary] Zod validation failed:", zodErr);
    console.warn("[ai-itinerary] Returning unvalidated parsed data as fallback.");
    return Response.json(parsed, {
      status: 200,
      headers: {
        "X-Validation-Warning": "Schema validation failed; data may be incomplete.",
      },
    });
  }

  return Response.json(validated, { status: 200 });
}