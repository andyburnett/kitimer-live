// cypress/e2e/data_test.cy.js

describe('3. Firestore Data Management Test', () => {
  
  // CRITICAL: Clear the database before testing data
  before(() => {
    // This calls the Node.js function via the registered task
    cy.task('clearFirestore'); 
  })

  beforeEach(() => {
    cy.login('facilitator-test-user-1') // Logs in the user
  })

  it('should successfully set a duration and verify the UI state', () => {
    // NOTE: This test will fail until you fix your application's UI transition bug.
    // If your app UI bug is fixed, the test below will pass.
    
    const TEST_DURATION = 35; // Minutes
    const EXPECTED_TIME = '35:00'; 
    
    // 1. Open the control modal (assuming UI bug is fixed and #timer-interface is visible)
    cy.get('#facilitator-trigger').click()
    cy.get('#control-modal').should('be.visible')
    
    // 2. Input the new duration
    cy.get('#duration').clear().type(TEST_DURATION.toString())
    
    // 3. Click SET (This should write the new duration to Firestore)
    cy.get('#set-button').click()
    
    // 4. Close the modal
    cy.get('#close-controls').click()
    
    // 5. Verify the data persisted by checking the main display
    cy.get('#time-display', { timeout: 5000 }).should('contain', EXPECTED_TIME) 
  })
})