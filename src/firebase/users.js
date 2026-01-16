import { db } from './config'; // Adjust path to your firebase config
import { doc, getDoc } from 'firebase/firestore';

/**
 * Fetches user profile data from Firestore
 * @param {string} uid - The user's unique ID
 */
export const getUserData = async (uid) => {
  if (!uid) return null;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};