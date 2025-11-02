// cypress/plugins/firestore-cleanup.js

const axios = require('axios');

/**
 * Clears all data from the Firebase Firestore Emulator using its REST API.
 * Ensures tests are isolated and don't interfere with each other.
 * @returns {Promise<string>} Success message.
 */
async function clearFirestore() {
  const projectId = 'kitimer-live'; // Your project ID from firebase.json
  // Default URL for clearing Firestore emulator data
  const URL = `http://localhost:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  
  try {
    // Send a DELETE request to the Firestore Emulator API endpoint
    await axios.delete(URL);
    return 'Firestore emulator cleared successfully.';
  } catch (error) {
    console.error('Firestore Cleanup Failed:', error.message);
    throw new Error('Could not connect to or clear Firestore Emulator. Is it running on port 8080?');
  }
}

module.exports = {
  clearFirestore,
};