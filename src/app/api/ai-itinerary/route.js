import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas — used ONLY for response validation, NOT passed to Gemini
// ─────────────────────────────────────────────────────────────────────────────
const ChecklistItemSchema = z.object({
  id:        z.string(),
  text:      z.string(),
  selected:  z.boolean(),
  isDefault: z.boolean(),
});

const DaySchema = z.object({
  id:          z.string(),
  dayNumber:   z.number(),
  title:       z.string(),
  description: z.string(),
  activityIds: z.array(z.string()),
});

const ItineraryResponseSchema = z.object({
  title:        z.string(),
  state:        z.string(),
  cities:       z.array(z.string()),
  tags:         z.array(z.string()),
  days:         z.array(DaySchema),
  inclusions:   z.array(ChecklistItemSchema),
  exclusions:   z.array(ChecklistItemSchema),
  tnc:          z.array(ChecklistItemSchema),
  cancellation: z.array(ChecklistItemSchema),
  impInfo:      z.array(ChecklistItemSchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Flat JSON schema — passed to Gemini (no $ref, no $defs, fully inlined)
// ─────────────────────────────────────────────────────────────────────────────
const checklistItemSchema = {
  type: "object",
  properties: {
    id:        { type: "string" },
    text:      { type: "string" },
    selected:  { type: "boolean" },
    isDefault: { type: "boolean" },
  },
  required: ["id", "text", "selected", "isDefault"],
};

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
    title:        { type: "string" },
    state:        { type: "string" },
    cities:       { type: "array", items: { type: "string" } },
    tags:         { type: "array", items: { type: "string" } },
    days:         { type: "array", items: daySchema },
    inclusions:   { type: "array", items: checklistItemSchema },
    exclusions:   { type: "array", items: checklistItemSchema },
    tnc:          { type: "array", items: checklistItemSchema },
    cancellation: { type: "array", items: checklistItemSchema },
    impInfo:      { type: "array", items: checklistItemSchema },
  },
  required: ["title", "state", "cities", "tags", "days", "inclusions", "exclusions", "tnc", "cancellation", "impInfo"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt({
  origin = "Origin City",
  destination = "Destination City",
  cities = [],
  numDays = 3,
  transport = "private car",
  arrivalTime,
  departureTime,
  additionalContext,
}) {
  const citiesList = cities.length > 0 ? cities.join(", ") : destination;

  return `
You are an expert Indian tour itinerary writer for Adwait Tours. 
Generate a complete, detailed, day-wise tour itinerary strictly following the rules below.

## TRIP DETAILS
- Origin: ${origin}
- Destination(s): ${citiesList}
- Total Days: ${numDays}
- Transport Mode: ${transport}
${arrivalTime  ? `- Check-in Date: ${arrivalTime}`   : ""}
${departureTime? `- Check-out Date: ${departureTime}`: ""}
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
- Use bullet points with '•' prefix for each activity/step.
- Include meal plan at the end of each day: "🍽 Meal Plan: [Breakfast / Lunch / Dinner / No Meals]"
- Be specific about timings (approximate is fine).
- Vehicle type is "${transport}" — mention it naturally in transfer descriptions.
- Generate EXACTLY ${numDays} day objects in the days array.

## OUTPUT
Return valid JSON matching the provided schema exactly.
IDs: use short slugs like "day-001", "inc-001", "exc-001", "tnc-001", "can-001", "imp-001".
also for day descriptions start each point with new line 
All checklist items must have selected: true and appropriate isDefault values.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const { packageContext } = body;
    console.log(packageContext)

    if (!packageContext) {
      return Response.json(
        { error: "packageContext is required." },
        { status: 400 }
      );
    }

    const {
      hotelEntries       = [],
      selectedTransport  = null,
      selectedActivities = [],
      selectedState      = "",
      checkInDate        = "",
      checkOutDate       = "",
      packageName        = "",
      customerName       = "",
    } = packageContext;

    // ── Derive cities & destination ─────────────────────────────────────────
    const cities = [...new Set(hotelEntries.map((e) => e.city).filter(Boolean))];
    const destination = cities[0] || selectedState || null;

    if (!destination) {
      return Response.json(
        { error: "Could not determine destination. Please add at least one hotel." },
        { status: 400 }
      );
    }

    // ── Derive numDays ──────────────────────────────────────────────────────
    const totalNights = hotelEntries.reduce(
      (sum, e) => sum + (Number(e.nights) || 0), 0
    );
    const numDays = totalNights > 0 ? totalNights + 1 : 3;

    // ── Derive transport mode ───────────────────────────────────────────────
    const vehicleType = selectedTransport?.selectedVehicle?.type || "";
    const vehicleLower = vehicleType.toLowerCase();
    const transport = vehicleLower.includes("train")  ? "train"
                    : vehicleLower.includes("flight") ? "flight"
                    : vehicleLower.includes("bus")    ? "bus"
                    : vehicleType || "private car";

    // ── Origin ──────────────────────────────────────────────────────────────
    const origin = selectedState || "Origin City";

    // ── Additional context ──────────────────────────────────────────────────
    const hotelLines = hotelEntries
      .map((e) =>
        [e.hotel, e.city, e.nights ? `${e.nights}N` : null, e.selectedMealPlan]
          .filter(Boolean).join(" | ")
      )
      .join("; ");

    const activityNames = selectedActivities
      .map((a) => a.name).filter(Boolean).join(", ");

    const additionalContext = [
      hotelLines    ? `Hotels: ${hotelLines}`               : null,
      activityNames ? `Activities: ${activityNames}`        : null,
      packageName   ? `Package: ${packageName}`             : null,
      customerName  ? `Customer: ${customerName}`           : null,
      vehicleType   ? `Vehicle: ${vehicleType}`             : null,
      selectedTransport?.name
                    ? `Transport package: ${selectedTransport.name}` : null,
    ].filter(Boolean).join(". ");

    // ── Init Gemini ─────────────────────────────────────────────────────────
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // ── Build prompt ────────────────────────────────────────────────────────
    const prompt = buildPrompt({
      origin,
      destination,
      cities,
      numDays,
      transport,
      arrivalTime:       checkInDate   || undefined,
      departureTime:     checkOutDate  || undefined,
      additionalContext: additionalContext || undefined,
    });

    // ── Call Gemini with flat inline schema ─────────────────────────────────
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType:   "application/json",
        responseJsonSchema: geminiSchema,
      },
    });

    const rawText = response.text;

    if (!rawText) {
      return Response.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    // ── Validate with Zod ───────────────────────────────────────────────────
    let parsed;
    try {
      parsed = ItineraryResponseSchema.parse(JSON.parse(rawText));
    } catch (parseError) {
      console.error("[ai-itinerary] Zod validation failed:", parseError);
      console.error("[ai-itinerary] Raw output:", rawText);
      return Response.json(
        {
          error: "AI response did not match expected schema.",
          details: parseError instanceof Error ? parseError.message : String(parseError),
        },
        { status: 422 }
      );
    }

    return Response.json(parsed, { status: 200 });

  } catch (err) {
    console.error("[ai-itinerary] Unexpected error:", err);
    return Response.json(
      {
        error: "Internal server error.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}