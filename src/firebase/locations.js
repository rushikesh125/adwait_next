// firebase/locations.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';


/**
 * Fetch all states/locations from Firestore
 * @returns {Promise<Array>} Array of location objects
 */
export const fetchAllLocations = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'locations'));
    const locationList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return locationList;
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw new Error('Failed to fetch locations');
  }
};