// firebase/activities.js
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';

/**
 * Fetch activities by state
 * @param {string} stateName - State name to filter by
 * @returns {Promise<Array>} Array of activity objects
 */
export const fetchActivitiesByState = async (stateName) => {
  if (!stateName) return [];

  try {
    const q = query(
      collection(db, 'activities'),
      where('state', '==', stateName)
    );
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return activities;
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw new Error('Failed to fetch activities');
  }
};

/**
 * Calculate activity price based on participants
 * @param {Object} activity - Activity object
 * @param {number} participants - Number of participants
 * @returns {number} Total price
 */
export const calculateActivityPrice = (activity, participants) => {
  if (!activity || !participants) return 0;

  // Group rate for 10+ participants, FIT rate for less
  const rate =
    participants >= 10
      ? parseFloat(activity.groupRatePerPerson || 0)
      : parseFloat(activity.fitRatePerPerson || 0);

  return rate * participants;
};