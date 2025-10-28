// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // ... other config ...
    setupNodeEvents(on, config) {
      // Import plugins
      const firebaseAuth = require('./cypress/plugins/firebase-auth');
      const firestoreCleanup = require('./cypress/plugins/firestore-cleanup'); // <-- New Import

      on('task', {
        async createTestUserToken(uid) {
          return await firebaseAuth.createTestUserToken(uid);
        },
        async clearFirestore() { // <-- New Task Registration
          return await firestoreCleanup.clearFirestore();
        }
      });

      return config;
    },
  },
})