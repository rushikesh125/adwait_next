// lib/hotelUploadFirestore.js
// Smart upsert logic for bulk hotel upload from Excel
// - Custom deterministic ID: state-city-hotelname (slugified)
// - Merges new data into existing docs; preserves old room categories not in new file
// - Works for single or multiple hotels in one Excel upload

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/config";

// ─── ID Generation ────────────────────────────────────────────────────────────
/**
 * Creates a deterministic, human-readable Firestore document ID.
 * e.g. "maharashtra-mumbai-hotel-taj"
 */
export function generateHotelId(state, city, hotelName) {
  const slugify = (str) =>
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")   // remove special chars
      .replace(/[\s_]+/g, "-")    // spaces → hyphens
      .replace(/-+/g, "-")        // collapse multiple hyphens
      .replace(/^-|-$/g, "");     // trim leading/trailing hyphens

  return [slugify(state), slugify(city), slugify(hotelName)]
    .filter(Boolean)
    .join("-");
}

// ─── Room Merge Logic ─────────────────────────────────────────────────────────
/**
 * Merges incoming rooms (from Excel) into existing rooms (from Firestore).
 *
 * Rules:
 * - If a room category exists in NEW data  → replace it entirely (new seasons/pricing win)
 * - If a room category exists ONLY in OLD  → keep it untouched (preserve old data)
 * - Matching is case-insensitive on categoryName
 *
 * @param {Array} existingRooms  - rooms currently in Firestore
 * @param {Array} incomingRooms  - rooms parsed from the new Excel upload
 * @returns {Array} merged rooms array
 */
export function mergeRooms(existingRooms = [], incomingRooms = []) {
  const incomingMap = new Map(
    incomingRooms.map((r) => [r.categoryName.toLowerCase().trim(), r])
  );

  // Start with existing rooms; replace any that appear in the incoming set
  const merged = existingRooms.map((existing) => {
    const key = existing.categoryName.toLowerCase().trim();
    return incomingMap.has(key) ? incomingMap.get(key) : existing;
  });

  // Append any brand-new room categories from the upload (not in existing)
  const existingKeys = new Set(
    existingRooms.map((r) => r.categoryName.toLowerCase().trim())
  );
  for (const incoming of incomingRooms) {
    if (!existingKeys.has(incoming.categoryName.toLowerCase().trim())) {
      merged.push(incoming);
    }
  }

  return merged;
}

// ─── Single Hotel Upsert ──────────────────────────────────────────────────────
/**
 * Upserts one hotel into Firestore using the custom deterministic ID.
 *
 * @param {Object} hotel  - hotel object as returned by the Excel parser:
 *   { name, state, city, googleRating, hotelLink, starRating, rooms[] }
 * @returns {{ id: string, action: 'created' | 'updated' }}
 */
export async function upsertHotel(hotel, orgId = null) {
  const hotelId = generateHotelId(hotel.state, hotel.city, hotel.name);
  const hotelRef = doc(db, "hotels", hotelId);

  // Build the payload in the same shape HotelFormPage uses
  const incomingPayload = {
    name: hotel.name?.trim() || "",
    state: hotel.state?.trim() || "",
    city: hotel.city?.trim() || "",
    rating: hotel.starRating
      ? hotel.starRating.includes("-star")
        ? hotel.starRating
        : `${hotel.starRating}-star`
      : "",
    GoogleReviewRating: hotel.googleRating || null,
    GoogleListingURL: hotel.hotelLink || null,
    TripAdvisorRating: null,   // not in Excel template; preserve if already set
    TripAdvisorURL: null,
    address: null,
    phone: null,
  };

  const snap = await getDoc(hotelRef);

  if (!snap.exists()) {
    // ── NEW hotel: create from scratch ──────────────────────────────────
    await setDoc(hotelRef, {
      ...incomingPayload,
      ...(orgId ? { orgId } : {}),
      rooms: hotel.rooms || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Also register the hotel ID in the locations collection (like HotelFormPage does)
    await _registerHotelInLocation(hotel.state, hotel.city, hotelId, orgId);

    return { id: hotelId, action: "created" };
  } else {
    // ── EXISTING hotel: smart merge ──────────────────────────────────────
    const existing = snap.data();
    if (orgId && existing.orgId !== orgId) {
      throw new Error("Hotel already exists outside this organization");
    }

    // For scalar fields: only overwrite if the incoming value is non-empty
    // (so a re-upload that omits googleRating won't blank it out)
    const mergedScalars = {
      name: incomingPayload.name || existing.name,
      state: incomingPayload.state || existing.state,
      city: incomingPayload.city || existing.city,
      rating: incomingPayload.rating || existing.rating,
      GoogleReviewRating:
        incomingPayload.GoogleReviewRating ?? existing.GoogleReviewRating,
      GoogleListingURL:
        incomingPayload.GoogleListingURL ?? existing.GoogleListingURL,
      // Always preserve these if they were set before (not in Excel)
      TripAdvisorRating: existing.TripAdvisorRating ?? null,
      TripAdvisorURL: existing.TripAdvisorURL ?? null,
      address: existing.address ?? null,
      phone: existing.phone ?? null,
    };

    const mergedRooms = mergeRooms(existing.rooms || [], hotel.rooms || []);

    await updateDoc(hotelRef, {
      ...mergedScalars,
      rooms: mergedRooms,
      updatedAt: new Date().toISOString(),
    });

    return { id: hotelId, action: "updated" };
  }
}

// ─── Bulk Save (all hotels from one Excel upload) ─────────────────────────────
/**
 * Saves all hotels extracted from one Excel file.
 * Runs upserts sequentially to avoid Firestore write-rate issues for large batches.
 *
 * @param {Array}    hotels    - array of hotel objects from the parser
 * @param {Function} onProgress - optional callback(index, total, result)
 * @returns {Array} results: [{ id, name, action }]
 */
export async function saveAllHotels(hotels, onProgress, orgId = null) {
  const results = [];

  for (let i = 0; i < hotels.length; i++) {
    const hotel = hotels[i];
    try {
      const result = await upsertHotel(hotel, orgId);
      const entry = { id: result.id, name: hotel.name, action: result.action };
      results.push(entry);
      if (onProgress) onProgress(i + 1, hotels.length, entry);
    } catch (err) {
      console.error(`[saveAllHotels] Failed for "${hotel.name}":`, err);
      results.push({
        id: generateHotelId(hotel.state, hotel.city, hotel.name),
        name: hotel.name,
        action: "error",
        error: err.message,
      });
    }
  }

  return results;
}

// ─── Internal: register hotel ID in locations collection ─────────────────────
async function _registerHotelInLocation(stateName, cityName, hotelId, orgId = null) {
  if (!stateName || !cityName) return;

  try {
    const locSnap = await getDocs(
      collection(db, "locations")
    );
    const stateDoc = locSnap.docs.find(
      (d) => d.data().name?.toLowerCase() === stateName.toLowerCase()
    );
    if (!stateDoc) return;

    const stateData = stateDoc.data();
    const cities = stateData.cities || [];
    const cityIndex = cities.findIndex(
      (c) => c.name?.toLowerCase() === cityName.toLowerCase()
    );

    if (cityIndex === -1) {
      // City doesn't exist yet → add it with this hotel
      await updateDoc(doc(db, "locations", stateDoc.id), {
        cities: arrayUnion({ name: cityName, hotelIds: [hotelId] }),
      });
    } else {
      // City exists → add hotelId if not already there
      const city = cities[cityIndex];
      if (!(city.hotelIds || []).includes(hotelId)) {
        const updatedCities = cities.map((c, i) =>
          i === cityIndex
            ? { ...c, hotelIds: [...(c.hotelIds || []), hotelId] }
            : c
        );
        await updateDoc(doc(db, "locations", stateDoc.id), {
          cities: updatedCities,
        });
      }
    }
  } catch (err) {
    // Non-fatal: log but don't block the hotel save
    console.warn("[_registerHotelInLocation] Could not update locations:", err);
  }
}
