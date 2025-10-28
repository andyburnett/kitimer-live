const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // This is the base URL Cypress will use for cy.visit()
    baseUrl: 'http://localhost:5000', // <-- We will update this with your actual port
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      // We will add the Firebase cleanup task here later
    },
  },
})