// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // === FIX FOR PROBLEM 1: SETTING BASE URL ===
    // This tells Cypress to load the application from the Firebase Hosting Emulator
    // whenever cy.visit('/') is called in a test.
    baseUrl: 'http://localhost:5000',
    
    // ... other config ...
    setupNodeEvents(on, config) {
      // Import plugins
      const firebaseAuth = require('./cypress/plugins/firebase-auth');
      const firestoreCleanup = require('./cypress/plugins/firestore-cleanup'); 

      on('task', {
        async createTestUserToken(uid) {
          return await firebaseAuth.createTestUserToken(uid);
        },
        async clearFirestore() { 
          return await firestoreCleanup.clearFirestore();
        },
        // 💡 RECOMMENDED CHANGE: Register the new Auth cleanup task
        async clearAuth() {
            return await firebaseAuth.clearFirebaseAuth(); 
        }
      });

      return config;
    },
  },
})