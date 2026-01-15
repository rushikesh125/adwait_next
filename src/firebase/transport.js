// firebase/transport.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';

/**
 * Fetch all transport states
 * @returns {Promise<Array>} Array of transport state objects
 */
export const fetchTransportStates = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'transport'));
    const statesList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return statesList;
  } catch (error) {
    console.error('Error fetching transport states:', error);
    throw new Error('Failed to fetch transport states');
  }
};

/**
 * Fetch transport packages for a specific state
 * @param {string} stateId - State ID (lowercase with hyphens)
 * @returns {Promise<Array>} Array of transport packages
 */
export const fetchTransportPackages = async (stateId) => {
  if (!stateId) return [];

  try {
    const formattedStateId = stateId.toLowerCase().replace(/ /g, '-');
    const packagesCollection = collection(
      db,
      'transport',
      formattedStateId,
      'packages'
    );
    const snapshot = await getDocs(packagesCollection);
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return list;
  } catch (error) {
    console.error('Error fetching transport packages:', error);
    throw new Error('Failed to fetch transport packages');
  }
};

/**
 * Calculate transport price
 * @param {Object} transportSummary - Transport summary object
 * @returns {number} Total transport price
 */
export const calculateTransportPrice = (transportSummary) => {
  if (!transportSummary) return 0;

  if (transportSummary.pricingType === 'perKm') {
    const kms = transportSummary.kms || 0;
    return kms * (transportSummary.perKmprice || 0);
  }

  return Number(transportSummary.price || 0);
};