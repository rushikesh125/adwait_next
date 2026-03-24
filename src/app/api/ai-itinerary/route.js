/**
 * POST /api/ai-itinerary
 * ──────────────────────────────────────────────────────────────────────────────
 * Receives basic trip info, calls Gemini 2.5 Flash with a strict JSON schema,
 * and returns a fully structured itinerary matching the ItineraryEditor shape.
 *
 * Expected request body:
 * {
 *   title?             : string       // optional seed title
 *   origin             : string       // departure city / station
 *   destination        : string       // main destination city
 *   cities?            : string[]     // list of cities to cover (optional)
 *   numDays            : number       // total trip duration in days
 *   transport?         : string       // "train" | "flight" | "bus" | "private car"
 *   arrivalTime?       : string       // e.g. "04:15 AM"
 *   departureTime?     : string       // e.g. "11:20 PM"
 *   additionalContext? : string       // any free-text extra info from agent
 * }
 *
 * Response — matches ItineraryEditor `onChange` shape:
 * {
 *   title, state, cities, tags,
 *   days: [{ id, dayNumber, title, description, activityIds }],
 *   inclusions, exclusions, tnc, cancellation, impInfo
 * }
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ChecklistItemSchema = z.object({
  id: z
    .string()
    .describe("Unique identifier for this item. Generate a short unique slug like 'inc-001'."),
  text: z.string().describe("The full text of the checklist item."),
  selected: z
    .boolean()
    .describe("Whether this item is selected/active by default. Always true for newly generated items."),
  isDefault: z
    .boolean()
    .describe("Whether this is a default/standard item. Set true for common industry-standard items."),
});

const DaySchema = z.object({
  id: z
    .string()
    .describe("Unique identifier for this day. Use format 'day-001', 'day-002', etc."),
  dayNumber: z.number().describe("Sequential day number starting from 1."),
  title: z
    .string()
    .describe(
      "Short punchy day title. e.g. 'Arrival & Bangalore City Tour' or 'Mysore – Palaces & Gardens'."
    ),
  description: z
    .string()
    .describe(
      `Detailed day-wise narrative following Adwait Tours structure:
- Day 1 (Arrival): Pickup from airport/station → hotel transfer → check-in. 
  If arrival before noon include a nearby attraction. If after 4PM rest only.
- Intermediate days: Full-day sightseeing of that city's well-known places. 
  Transition days: morning checkout + transfer + afternoon sightseeing in new city.
  Mention vehicle type naturally. Include meal timings.
- Last day (Departure): Morning checkout. If departure after 12PM include one short activity (max 2hr). 
  If before 8AM direct transfer only. Transfer to airport/station → departure.
Use bullet points with '•' for each activity. Include timings where relevant.`
    ),
  activityIds: z
    .array(z.string())
    .describe("Leave as empty array []. Activity IDs are linked separately by the user."),
});

const ItineraryResponseSchema = z.object({
  title: z
    .string()
    .describe(
      "Descriptive itinerary title. e.g. '5N/6D Bangalore & Mysore Tour from Aurangabad'."
    ),
  state: z
    .string()
    .describe("Primary Indian state where most sightseeing occurs. e.g. 'Karnataka'."),
  cities: z
    .array(z.string())
    .describe("All cities covered in the itinerary, in visit order. e.g. ['Bangalore', 'Mysore']."),
  tags: z
    .array(z.string())
    .describe(
      "3–6 relevant tags. e.g. ['Cultural', 'Heritage', 'Nature', 'Family', 'South India']."
    ),
  days: z
    .array(DaySchema)
    .describe("Array of day objects. Must have exactly numDays entries."),
  inclusions: z
    .array(ChecklistItemSchema)
    .describe(
      `Standard tour inclusions. Always include these Adwait Tours defaults:
- Hotel to Airport transfer on the day of departure.
- All tours & transfers are on a shared coach basis.
- Airport to Hotel transfer on the day of arrival.
- All sightseeing entry fees.
Add trip-specific ones based on destinations (e.g. Brindavan Garden light show entry).`
    ),
  exclusions: z
    .array(ChecklistItemSchema)
    .describe(
      `Standard tour exclusions. Always include:
- International or domestic flight tickets unless specified.
- Any item of personal nature like tips, laundry, telephone calls etc.
- Any other sightseeing other than those mentioned in the inclusions section.
- Any fee for video or camera permit.`
    ),
  tnc: z
    .array(ChecklistItemSchema)
    .describe(
      `Standard T&C items. Always include:
- No rooms are booked or blocked yet, Rooms are subjected to availability.
- Package cost will vary depends on currency fluctuations.
- No flights are booked or blocked yet, Airfare & Seats are subjected to availability.
- Itinerary may change but the inclusions will remain same.`
    ),
  cancellation: z
    .array(ChecklistItemSchema)
    .describe(
      `Standard cancellation policy items. Always include:
- These are non-refundable amounts as per the current components attached.
- Please check the exact cancellation and date change policy on the review page before proceeding further.
- Please note, TCS once collected cannot be refunded in case of any cancellation / modification.
- Cancellation charges shown is exclusive of all taxes and taxes will be added as per applicable.`
    ),
  impInfo: z
    .array(ChecklistItemSchema)
    .describe(
      `Important information checklist. Always include:
- Ensure your passport is valid for at least six months beyond your intended date of return.
- Make sure you have enough blank pages for visa stamps.
- Obtain the appropriate visa for your destination country.
- Ensure the visa covers your entire stay.
- Ensure your travel insurance covers medical emergencies, trip cancellations, and loss of belongings.
- Carry a copy of your travel insurance policy.
- Carry an additional government-issued ID (e.g., Aadhar card, driving license).
Add destination-specific tips (e.g. dress code for temples in Mysore, best time to visit gardens).`
    ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt({
  title,
  origin = "Origin City",
  destination = "Destination City",
  cities = [],
  numDays = 3,
  transport = "train",
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
${title ? `- Suggested Title: ${title}` : ""}
${arrivalTime ? `- Arrival Time at Destination: ${arrivalTime}` : ""}
${departureTime ? `- Departure Time from Final City: ${departureTime}` : ""}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

## ITINERARY RULES (follow strictly)

### Day 1 — Arrival
- Always the first day. Covers travel from ${origin} to first destination.
- Include departure logistics from ${origin} (time, train/flight number if known).
- Pickup from airport/railway station upon arrival → transfer to hotel → check-in.
- If arrival before 12:00 PM: include a nearby attraction or local orientation in the afternoon.
- If arrival after 4:00 PM: check-in and rest only. No sightseeing.
- Mention meal plan (typically "No Meals" on travel days).

### Intermediate Days — Sightseeing
- One full day per city. Use REAL, well-known attractions for each city.
- For ${destination} region, include famous landmarks, gardens, temples, museums, tech centres etc.
- For Mysore specifically: Mysore Palace, Chamundeshwari Hill, Brindavan Garden, Srirangapatna.
- For Bangalore specifically: Vidhan Soudha, Cubbon Park, Lalbagh, ISKCON Temple, Visvesvaraya Museum.
- Transition day (moving city to city): morning checkout + drive to next city + afternoon sightseeing + check-in.
- Mention meal timings naturally: Breakfast ~8AM, Lunch ~1PM, Dinner ~8PM.
- Include approximate timings for each activity.

### Last Day — Departure
- Morning checkout. If departure after 12 PM: one short activity (max 2 hrs) before transfer.
- If departure before 8 AM: checkout and direct transfer only — no activities.
- Transfer to ${origin} via ${transport}. Include train/flight departure time if provided.
- Meal plan: typically "No Meals" on travel days.

### General Rules
- Write descriptions in second-person ("proceed to...", "enjoy...", "check in at...").
- Use bullet points with '•' prefix for each activity/step.
- Include meal plan at the end of each day description: "🍽 Meal Plan: [Breakfast / Lunch / Dinner / No Meals]"
- Be specific about timings (approximate is fine).
- Vehicle type is "${transport}" — mention it naturally in transfer descriptions.
- Generate EXACTLY ${numDays} day objects in the days array.

## OUTPUT
Return valid JSON matching the provided schema exactly. 
IDs: use short slugs like "day-001", "inc-001", "exc-001", "tnc-001", "can-001", "imp-001" etc.
All checklist items must have selected: true and appropriate isDefault values.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();

    const {
      title,
      origin,
      destination,
      cities,
      numDays = 3,
      transport = "train",
      arrivalTime,
      departureTime,
      additionalContext,
    } = body;

    if (!destination) {
      return Response.json(
        { error: "destination is required." },
        { status: 400 }
      );
    }

    // ── Init Gemini client ──────────────────────────────────────────────────
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // ── Build prompt & JSON schema ──────────────────────────────────────────
    const prompt = buildPrompt({
      title,
      origin,
      destination,
      cities,
      numDays,
      transport,
      arrivalTime,
      departureTime,
      additionalContext,
    });

    const jsonSchema = zodToJsonSchema(ItineraryResponseSchema, {
      name: "ItineraryResponse",
      $refStrategy: "none", // inline all $refs — Gemini needs a flat schema, no $ref pointers
    });

    // ── Call Gemini 2.5 Flash ───────────────────────────────────────────────
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    });

    const rawText = response.text;

    if (!rawText) {
      return Response.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    // ── Parse & validate with Zod ───────────────────────────────────────────
    let parsed;
    try {
      parsed = ItineraryResponseSchema.parse(JSON.parse(rawText));
    } catch (parseError) {
      console.error("[ai-itinerary] Zod validation failed:", parseError);
      console.error("[ai-itinerary] Raw Gemini output:", rawText);
      return Response.json(
        {
          error: "AI response did not match expected schema.",
          details: parseError instanceof Error ? parseError.message : String(parseError),
        },
        { status: 422 }
      );
    }

    // ── Return ──────────────────────────────────────────────────────────────
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