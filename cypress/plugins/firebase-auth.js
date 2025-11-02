// cypress/plugins/firebase-auth.js

const admin = require('firebase-admin');

// Ensure you have Node's fetch available if not using a recent Node version (v18+)
// If your container is running a Node version that doesn't have fetch (e.g., v16), 
// you may need to 'npm install node-fetch' and uncomment the line below:
// const fetch = require('node-fetch');

// 1. Point to your downloaded service account file
const serviceAccount = require('../../serviceAccount.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- CORE FUNCTIONS ---

/**
 * Generates a custom test token for a given user ID.
 * Cypress Task runs in the Node environment (server-side).
 * @param {string} uid The test user's unique ID.
 * @returns {Promise<string>} The custom token.
 */
async function createTestUserToken(uid) {
  // Check if the user exists in the emulator; create them if they don't.
  try {
    await admin.auth().getUser(uid);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      await admin.auth().createUser({ uid });
      console.log(`Created new test user: ${uid}`);
    } else {
      throw error;
    }
  }
  
  // Use the Admin SDK to create a custom token
  return admin.auth().createCustomToken(uid); 
}

/**
 * CLEARS ALL USER ACCOUNTS from the Firebase Auth Emulator.
 * This is crucial for maintaining clean state between tests.
 * This function uses a direct REST endpoint for the Emulator.
 * @returns {Promise<null>} Always returns null after cleanup.
 */
async function clearFirebaseAuth() {
  const projectId = process.env.FIREBASE_PROJECT || 'kitimer-live';
  // Default Auth Emulator port is 9099
  const url = `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`;
  
  try {
    const response = await fetch(url, { method: 'DELETE' });
    if (response.ok) {
      console.log(`✅ Successfully cleared Firebase Auth Emulator for project: ${projectId}`);
    } else {
      const text = await response.text();
      console.error(`⚠️ Failed to clear Auth Emulator (${response.status}): ${text}`);
      throw new Error(`Auth Emulator clear failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('🔴 Error communicating with Auth Emulator:', error.message);
    // Throw an error to fail the Cypress task
    throw error;
  }
  
  return null;
}

// --- EXPORTS ---

module.exports = {
  createTestUserToken,
  // 💡 NEW EXPORT: Add the cleanup function to be used as a Cypress task
  clearFirebaseAuth,
};