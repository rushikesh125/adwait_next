// firebase/hotels.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';


/**
 * Fetch all hotels from Firestore
 * Removes duplicates based on name, state, and city
 * @returns {Promise<Array>} Array of unique hotel objects
 */
export const fetchAllHotels = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'hotels'));
    const hotelList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      rooms: doc.data().rooms || [],
    }));

    // Remove duplicates
    const uniqueHotelsMap = new Map();
    const uniqueHotels = hotelList.filter((hotel) => {
      const key = `${hotel.name.toLowerCase()}-${hotel.state.toLowerCase()}-${hotel.city.toLowerCase()}`;
      if (!uniqueHotelsMap.has(key)) {
        uniqueHotelsMap.set(key, true);
        return true;
      }
      return false;
    });

    return uniqueHotels;
  } catch (error) {
    console.error('Error fetching hotels:', error);
    throw new Error('Failed to fetch hotels');
  }
};

/**
 * Filter hotels by state
 * @param {Array} hotels - All hotels
 * @param {string} stateName - State to filter by
 * @returns {Array} Filtered hotels
 */
export const filterHotelsByState = (hotels, stateName) => {
  return hotels.filter(
    (hotel) => hotel.state.toLowerCase() === stateName.toLowerCase()
  );
};

/**
 * Group hotels by city
 * @param {Array} hotels - Hotels to group
 * @returns {Object} Hotels grouped by city
 */
export const groupHotelsByCity = (hotels) => {
  return hotels.reduce((acc, hotel) => {
    const city = hotel.city;
    if (!acc[city]) acc[city] = [];
    acc[city].push(hotel);
    return acc;
  }, {});
};

/**
 * Get applicable season for a hotel room category
 * @param {Array} seasons - Room category seasons
 * @param {string} checkInDate - Check-in date (ISO string)
 * @returns {Object|null} Applicable season or null
 */
export const getApplicableSeason = (seasons, checkInDate) => {
  const checkInDateObj = new Date(checkInDate);
  checkInDateObj.setHours(0, 0, 0, 0);

  return (
    seasons.find((season) => {
      const start = new Date(season.start);
      const end = new Date(season.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return checkInDateObj >= start && checkInDateObj <= end;
    }) || null
  );
};

/**
 * Calculate hotel price for given parameters
 * @param {Object} hotelEntry - Hotel entry with room details
 * @param {Object} fullHotelData - Complete hotel data from DB
 * @returns {number} Total price
 */
export const calculateHotelPrice = (hotelEntry, fullHotelData) => {
  if (!hotelEntry || !fullHotelData) return 0;

  const {
    checkInDate,
    selectedRoomCategory,
    selectedMealPlan,
    numDouble = 0,
    numExtraAdult = 0,
    numExtraChild = 0,
    nights = 1,
  } = hotelEntry;

  // Find room category
  const roomData = fullHotelData.rooms.find(
    (r) => r.categoryName === selectedRoomCategory
  );
  if (!roomData || !Array.isArray(roomData.seasons)) return 0;

  // Parse check-in date
  const checkInDateObj = checkInDate?.seconds
    ? new Date(checkInDate.seconds * 1000)
    : new Date(checkInDate);
  if (isNaN(checkInDateObj.getTime())) return 0;

  checkInDateObj.setHours(0, 0, 0, 0);

  // Find applicable season
  const applicableSeason = getApplicableSeason(roomData.seasons, checkInDate);
  if (!applicableSeason || !applicableSeason.pricing || !selectedMealPlan)
    return 0;

  // Get pricing for meal plan
  const pricing = applicableSeason.pricing[selectedMealPlan.toLowerCase()];
  if (!pricing) return 0;

  // Calculate total
  const doublePrice = (pricing.double || 0) * numDouble;
  const adultPrice = (pricing.extraAdult || 0) * numExtraAdult;
  const childPrice = (pricing.extraChild || 0) * numExtraChild;

  return (doublePrice + adultPrice + childPrice) * nights;
};

/**
 * Get available meal plans for a hotel room category
 * @param {Object} hotelEntry - Hotel entry
 * @param {Object} fullHotelData - Complete hotel data
 * @returns {Array} Available meal plan codes
 */
export const getAvailableMealPlans = (hotelEntry, fullHotelData) => {
  if (!fullHotelData || !Array.isArray(fullHotelData.rooms))
    return ['EP', 'CP', 'MAP', 'AP'];

  const roomCategoryData = fullHotelData.rooms.find(
    (r) => r.categoryName === hotelEntry.selectedRoomCategory
  );

  if (!roomCategoryData || !Array.isArray(roomCategoryData.seasons))
    return ['EP', 'CP', 'MAP', 'AP'];

  const applicableSeason = getApplicableSeason(
    roomCategoryData.seasons,
    hotelEntry.checkInDate
  );

  if (!applicableSeason || !applicableSeason.pricing)
    return ['EP', 'CP', 'MAP', 'AP'];

  const mealPlanOptions = [];
  ['EP', 'CP', 'MAP', 'AP'].forEach((plan) => {
    const planKey = plan.toLowerCase();
    const pricing = applicableSeason.pricing[planKey];
    if (
      pricing &&
      (pricing.double > 0 || pricing.extraAdult > 0 || pricing.extraChild > 0)
    ) {
      mealPlanOptions.push(plan);
    }
  });

  return mealPlanOptions.length > 0 ? mealPlanOptions : ['EP'];
};