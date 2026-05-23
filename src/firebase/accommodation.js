import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { belongsToOrg } from "./orgScope";
import toast from "react-hot-toast";

async function assertHotelOrg(hotelId, orgId) {
  if (!orgId) return;
  const snap = await getDoc(doc(db, "hotels", hotelId));
  if (!snap.exists() || !belongsToOrg(snap.data(), orgId)) {
    throw new Error("Hotel not found");
  }
}

const MEAL_PLAN_ORDER = ["ep", "cp", "map", "ap"];
const RATE_CATEGORIES = ["double", "extraAdult", "extraChild", "cnb"];
const RATE_CATEGORY_LABELS = {
  double: "Double",
  extraAdult: "Extra Adult",
  extraChild: "Extra Child",
  cnb: "CNB",
};
const MEAL_PLAN_LABELS = {
  ep: "EP",
  cp: "CP",
  map: "MAP",
  ap: "AP",
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasAnyPositiveValue = (values) => values.some((value) => toNumber(value) > 0);
const hasPositiveValue = (value) => toNumber(value) > 0;

const getHierarchyErrorsForSeason = (season, roomIndex, seasonIndex) => {
  const errors = [];
  const pricing = season?.pricing || {};
  const seasonPrefix = `Room ${roomIndex + 1}, Season ${seasonIndex + 1}`;

  RATE_CATEGORIES.forEach((categoryKey) => {
    const availablePlanRates = MEAL_PLAN_ORDER
      .map((planKey) => ({
        planKey,
        value: toNumber(pricing?.[planKey]?.[categoryKey]),
      }))
      .filter(({ value }) => value > 0);

    if (availablePlanRates.length < 2) return;

    const isOrdered = availablePlanRates.every(
      ({ value }, index) => index === 0 || availablePlanRates[index - 1].value < value,
    );

    if (!isOrdered) {
      errors.push(
        `${seasonPrefix}: ${RATE_CATEGORY_LABELS[categoryKey]} rates must follow EP < CP < MAP < AP.`,
      );
    }
  });

  MEAL_PLAN_ORDER.forEach((planKey) => {
    if (!pricing?.[planKey]) return;

    const values = RATE_CATEGORIES.map((categoryKey) => pricing[planKey]?.[categoryKey]);
    if (!hasAnyPositiveValue(values)) return;

    const doubleRate = toNumber(pricing[planKey]?.double);
    const extraAdultRate = toNumber(pricing[planKey]?.extraAdult);
    const extraChildRate = toNumber(pricing[planKey]?.extraChild);
    const cnbRate = toNumber(pricing[planKey]?.cnb);

    if (
      hasPositiveValue(doubleRate) &&
      hasPositiveValue(extraAdultRate) &&
      !(doubleRate > extraAdultRate)
    ) {
      errors.push(
        `${seasonPrefix}: ${MEAL_PLAN_LABELS[planKey]} rates must follow Double > Extra Adult >= Extra Child > CNB.`,
      );
      return;
    }

    if (
      hasPositiveValue(extraAdultRate) &&
      hasPositiveValue(extraChildRate) &&
      !(extraAdultRate >= extraChildRate)
    ) {
      errors.push(
        `${seasonPrefix}: ${MEAL_PLAN_LABELS[planKey]} rates must follow Double > Extra Adult >= Extra Child > CNB.`,
      );
      return;
    }

    if (
      hasPositiveValue(extraChildRate) &&
      hasPositiveValue(cnbRate) &&
      !(extraChildRate > cnbRate)
    ) {
      errors.push(
        `${seasonPrefix}: ${MEAL_PLAN_LABELS[planKey]} rates must follow Double > Extra Adult >= Extra Child > CNB.`,
      );
    }
  });

  return errors;
};

/**
 * Update hotel basic information
 * @param {string} hotelId - The hotel document ID
 * @param {object} hotelData - Updated hotel data
 * @returns {Promise<boolean>} - Success status
 */
export const updateHotelBasicInfo = async (hotelId, hotelData, orgId = null) => {
  try {
    await assertHotelOrg(hotelId, orgId);
    const hotelRef = doc(db, "hotels", hotelId);
    
    await updateDoc(hotelRef, {
      name: hotelData.name?.trim(),
      city: hotelData.city?.trim(),
      state: hotelData.state?.trim(),
      rating: hotelData.rating,
      GoogleReviewRating: hotelData.GoogleReviewRating || null,
      GoogleListingURL: hotelData.GoogleListingURL || null,
    });

    toast.success("Hotel basic info updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating hotel basic info:", error);
    toast.error("Failed to update hotel basic info");
    return false;
  }
};

/**
 * Update entire hotel document including rooms
 * @param {string} hotelId - The hotel document ID
 * @param {object} hotelData - Complete hotel data including rooms
 * @returns {Promise<boolean>} - Success status
 */
export const updateHotelComplete = async (hotelId, hotelData, orgId = null) => {
  try {
    await assertHotelOrg(hotelId, orgId);
    const hotelRef = doc(db, "hotels", hotelId);
    
    // Validate rooms data structure
    const validatedRooms = hotelData.rooms?.map(room => ({
      categoryName: room.categoryName?.trim() || "",
      seasons: room.seasons?.map(season => ({
        name: season.name?.trim() || "",
        start: season.start || "",
        end: season.end || "",
        priority: season.priority !== null && season.priority !== undefined ? Number(season.priority) : null,
        pricing: {
          ...(season.pricing?.ep && {
            ep: {
              double: Number(season.pricing.ep.double) || 0,
              extraAdult: Number(season.pricing.ep.extraAdult) || 0,
              extraChild: Number(season.pricing.ep.extraChild) || 0,
              cnb: Number(season.pricing.ep.cnb) || 0,
            }
          }),
          ...(season.pricing?.cp && {
            cp: {
              double: Number(season.pricing.cp.double) || 0,
              extraAdult: Number(season.pricing.cp.extraAdult) || 0,
              extraChild: Number(season.pricing.cp.extraChild) || 0,
              cnb: Number(season.pricing.cp.cnb) || 0,
            }
          }),
          ...(season.pricing?.map && {
            map: {
              double: Number(season.pricing.map.double) || 0,
              extraAdult: Number(season.pricing.map.extraAdult) || 0,
              extraChild: Number(season.pricing.map.extraChild) || 0,
              cnb: Number(season.pricing.map.cnb) || 0,
            }
          }),
          ...(season.pricing?.ap && {
            ap: {
              double: Number(season.pricing.ap.double) || 0,
              extraAdult: Number(season.pricing.ap.extraAdult) || 0,
              extraChild: Number(season.pricing.ap.extraChild) || 0,
              cnb: Number(season.pricing.ap.cnb) || 0,
            }
          }),
        }
      })) || []
    })) || [];

    await updateDoc(hotelRef, {
      name: hotelData.name?.trim(),
      city: hotelData.city?.trim(),
      state: hotelData.state?.trim(),
      rating: hotelData.rating,
      GoogleReviewRating: hotelData.GoogleReviewRating || null,
      GoogleListingURL: hotelData.GoogleListingURL || null,
      rooms: validatedRooms,
    });

    toast.success("Hotel updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating hotel:", error);
    toast.error("Failed to update hotel: " + error.message);
    return false;
  }
};

/**
 * Update only rooms data for a hotel
 * @param {string} hotelId - The hotel document ID
 * @param {array} rooms - Updated rooms array
 * @returns {Promise<boolean>} - Success status
 */
export const updateHotelRooms = async (hotelId, rooms, orgId = null) => {
  try {
    await assertHotelOrg(hotelId, orgId);
    const hotelRef = doc(db, "hotels", hotelId);
    
    const validatedRooms = rooms?.map(room => ({
      categoryName: room.categoryName?.trim() || "",
      seasons: room.seasons?.map(season => ({
        name: season.name?.trim() || "",
        start: season.start || "",
        end: season.end || "",
        priority: season.priority !== null && season.priority !== undefined ? Number(season.priority) : null,
        pricing: {
          ...(season.pricing?.ep && {
            ep: {
              double: Number(season.pricing.ep.double) || 0,
              extraAdult: Number(season.pricing.ep.extraAdult) || 0,
              extraChild: Number(season.pricing.ep.extraChild) || 0,
              cnb: Number(season.pricing.ep.cnb) || 0,
            }
          }),
          ...(season.pricing?.cp && {
            cp: {
              double: Number(season.pricing.cp.double) || 0,
              extraAdult: Number(season.pricing.cp.extraAdult) || 0,
              extraChild: Number(season.pricing.cp.extraChild) || 0,
              cnb: Number(season.pricing.cp.cnb) || 0,
            }
          }),
          ...(season.pricing?.map && {
            map: {
              double: Number(season.pricing.map.double) || 0,
              extraAdult: Number(season.pricing.map.extraAdult) || 0,
              extraChild: Number(season.pricing.map.extraChild) || 0,
              cnb: Number(season.pricing.map.cnb) || 0,
            }
          }),
          ...(season.pricing?.ap && {
            ap: {
              double: Number(season.pricing.ap.double) || 0,
              extraAdult: Number(season.pricing.ap.extraAdult) || 0,
              extraChild: Number(season.pricing.ap.extraChild) || 0,
              cnb: Number(season.pricing.ap.cnb) || 0,
            }
          }),
        }
      })) || []
    })) || [];

    await updateDoc(hotelRef, {
      rooms: validatedRooms,
    });

    toast.success("Room categories updated successfully!");
    return true;
  } catch (error) {
    console.error("Error updating rooms:", error);
    toast.error("Failed to update rooms");
    return false;
  }
};

/**
 * Delete a hotel from the database
 * @param {string} hotelId - The hotel document ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteHotel = async (hotelId, orgId = null) => {
  try {
    const hotelRef = doc(db, "hotels", hotelId);
    const hotelSnap = await getDoc(hotelRef);

    if (!hotelSnap.exists() || !belongsToOrg(hotelSnap.data(), orgId)) {
      toast.error("Hotel not found");
      return false;
    }

    await deleteDoc(hotelRef);
    
    toast.success("Hotel deleted successfully!");
    return true;
  } catch (error) {
    console.error("Error deleting hotel:", error);
    toast.error("Failed to delete hotel");
    return false;
  }
};

/**
 * Add a new room category to existing hotel
 * @param {string} hotelId - The hotel document ID
 * @param {object} newRoom - New room category data
 * @returns {Promise<boolean>} - Success status
 */
export const addRoomCategory = async (hotelId, newRoom, orgId = null) => {
  try {
    await assertHotelOrg(hotelId, orgId);
    const hotelRef = doc(db, "hotels", hotelId);
    const hotelSnap = await getDoc(hotelRef);

    if (!hotelSnap.exists()) {
      toast.error("Hotel not found");
      return false;
    }

    const currentRooms = hotelSnap.data().rooms || [];
    
    const validatedRoom = {
      categoryName: newRoom.categoryName?.trim() || "",
      seasons: newRoom.seasons?.map(season => ({
        name: season.name?.trim() || "",
        start: season.start || "",
        end: season.end || "",
        priority: season.priority !== null && season.priority !== undefined ? Number(season.priority) : null,
        pricing: {
          ...(season.pricing?.ep && {
            ep: {
              double: Number(season.pricing.ep.double) || 0,
              extraAdult: Number(season.pricing.ep.extraAdult) || 0,
              extraChild: Number(season.pricing.ep.extraChild) || 0,
              cnb: Number(season.pricing.ep.cnb) || 0,
            }
          }),
          ...(season.pricing?.cp && {
            cp: {
              double: Number(season.pricing.cp.double) || 0,
              extraAdult: Number(season.pricing.cp.extraAdult) || 0,
              extraChild: Number(season.pricing.cp.extraChild) || 0,
              cnb: Number(season.pricing.cp.cnb) || 0,
            }
          }),
          ...(season.pricing?.map && {
            map: {
              double: Number(season.pricing.map.double) || 0,
              extraAdult: Number(season.pricing.map.extraAdult) || 0,
              extraChild: Number(season.pricing.map.extraChild) || 0,
              cnb: Number(season.pricing.map.cnb) || 0,
            }
          }),
          ...(season.pricing?.ap && {
            ap: {
              double: Number(season.pricing.ap.double) || 0,
              extraAdult: Number(season.pricing.ap.extraAdult) || 0,
              extraChild: Number(season.pricing.ap.extraChild) || 0,
              cnb: Number(season.pricing.ap.cnb) || 0,
            }
          }),
        }
      })) || []
    };

    await updateDoc(hotelRef, {
      rooms: [...currentRooms, validatedRoom],
    });

    toast.success("Room category added successfully!");
    return true;
  } catch (error) {
    console.error("Error adding room category:", error);
    toast.error("Failed to add room category");
    return false;
  }
};

/**
 * Remove a room category from hotel
 * @param {string} hotelId - The hotel document ID
 * @param {number} roomIndex - Index of room to remove
 * @returns {Promise<boolean>} - Success status
 */
export const removeRoomCategory = async (hotelId, roomIndex, orgId = null) => {
  try {
    await assertHotelOrg(hotelId, orgId);
    const hotelRef = doc(db, "hotels", hotelId);
    const hotelSnap = await getDoc(hotelRef);

    if (!hotelSnap.exists()) {
      toast.error("Hotel not found");
      return false;
    }

    const currentRooms = hotelSnap.data().rooms || [];
    const updatedRooms = currentRooms.filter((_, index) => index !== roomIndex);

    await updateDoc(hotelRef, {
      rooms: updatedRooms,
    });

    toast.success("Room category removed successfully!");
    return true;
  } catch (error) {
    console.error("Error removing room category:", error);
    toast.error("Failed to remove room category");
    return false;
  }
};

/**
 * Validate hotel data before saving
 * @param {object} hotelData - Hotel data to validate
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export const validateHotelData = (hotelData) => {
  const errors = [];

  if (!hotelData.name?.trim()) {
    errors.push("Hotel name is required");
  }

  if (!hotelData.city?.trim()) {
    errors.push("City is required");
  }

  if (!hotelData.state?.trim()) {
    errors.push("State is required");
  }

  // Validate rooms if present
  if (hotelData.rooms && hotelData.rooms.length > 0) {
    hotelData.rooms.forEach((room, roomIndex) => {
      if (!room.categoryName?.trim()) {
        errors.push(`Room category ${roomIndex + 1}: Name is required`);
      }

      if (room.seasons && room.seasons.length > 0) {
        room.seasons.forEach((season, seasonIndex) => {
          if (!season.name?.trim()) {
            errors.push(`Room ${roomIndex + 1}, Season ${seasonIndex + 1}: Name is required`);
          }
          if (!season.start) {
            errors.push(`Room ${roomIndex + 1}, Season ${seasonIndex + 1}: Start date is required`);
          }
          if (!season.end) {
            errors.push(`Room ${roomIndex + 1}, Season ${seasonIndex + 1}: End date is required`);
          }

          errors.push(...getHierarchyErrorsForSeason(season, roomIndex, seasonIndex));
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
