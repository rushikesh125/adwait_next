// firebase/packages.js
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Save a new package to Firestore
 * @param {string} agentId - Agent's user ID
 * @param {Object} packageData - Package data to save
 * @returns {Promise<Object>} Created document reference
 */
export const savePackage = async (agentId, packageData) => {
  if (!agentId) throw new Error('Agent ID is required');

  try {
    const agentRef = doc(db, 'saved_packages_by_agents', agentId);
    const packagesCollectionRef = collection(agentRef, 'packages');

    const dataToSave = {
      ...packageData,
      createdAt: serverTimestamp(),
      status: packageData.status || 'Draft',
    };

    const docRef = await addDoc(packagesCollectionRef, dataToSave);
    return docRef;
  } catch (error) {
    console.error('Error saving package:', error);
    throw new Error('Failed to save package');
  }
};

/**
 * Calculate total hotel price for all nights
 * @param {Array} hotelEntries - Array of hotel entries
 * @returns {number} Total hotel price
 */
export const calculateTotalHotelPrice = (hotelEntries) => {
  if (!Array.isArray(hotelEntries) || hotelEntries.length === 0) return 0;

  return hotelEntries.reduce((sum, hotel) => {
    const perNightCost = parseFloat(hotel.hotelTotal) || 0;
    const numberOfNights = parseInt(hotel.nights) || 0;
    return sum + perNightCost * numberOfNights;
  }, 0);
};

/**
 * Calculate total activities price
 * @param {Array} activitySummary - Array of activities
 * @returns {number} Total activities price
 */
export const calculateTotalActivitiesPrice = (activitySummary) => {
  if (!Array.isArray(activitySummary) || activitySummary.length === 0) return 0;

  return activitySummary.reduce((sum, activity) => {
    return sum + (parseFloat(activity.totalPrice) || 0);
  }, 0);
};

/**
 * Calculate markup amount
 * @param {number} baseTotal - Base total before markup
 * @param {number} markupAmount - Markup amount
 * @param {string} markupType - 'lumpsum' or 'percentage'
 * @returns {number} Calculated markup
 */
export const calculateMarkup = (baseTotal, markupAmount, markupType) => {
  if (markupType === 'percentage') {
    return (parseFloat(markupAmount) / 100) * baseTotal;
  }
  return parseFloat(markupAmount) || 0;
};