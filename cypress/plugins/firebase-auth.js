// cypress/plugins/firebase-auth.js

const admin = require('firebase-admin');

// 1. Point to your downloaded service account file
const serviceAccount = require('../../serviceAccount.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


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

module.exports = {
  createTestUserToken,
};