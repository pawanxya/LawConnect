import { Lawyer } from "../models/Lawyer.js";

/**
 * Ensures a lawyer profile exists for a given user ID.
 * If it doesn't exist, it creates one with default values.
 * @param {string} userId - The ID of the user from the User collection.
 * @param {Object} data - Additional data to set or update.
 * @returns {Promise<Object>} The lawyer profile document.
 */
export const ensureLawyerProfile = async (userId, data = {}) => {
  try {
    if (!userId) {
      throw new Error("userId is required to ensure lawyer profile.");
    }

    // Find the profile or create it if it doesn't exist
    const profile = await Lawyer.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          userId,
          ...data 
        } 
      },
      { 
        new: true, 
        upsert: true, 
        setDefaultsOnInsert: true 
      }
    );

    return profile;
  } catch (error) {
    console.error("[ERROR] ensureLawyerProfile:", error.message);
    throw error;
  }
};
