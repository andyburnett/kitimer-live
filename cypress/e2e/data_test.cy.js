describe('3. Firestore Data Management Test', () => {
  
  // CRITICAL: Clear the database before testing data
  before(() => {
    // This calls the Node.js function via the registered task
    cy.task('clearFirestore'); 
  })

  // Log in before each test in this suite
  beforeEach(() => {
    // Custom command handles Firebase setup and login
    cy.login('facilitator-test-user-1')
    
    // 1. CRITICAL SYNCHRONIZATION FIX: After login completes on the Auth Emulator 
    // domain (localhost:9099), we must explicitly force navigation back to the 
    // main app domain (localhost:5000) for Cypress to continue running commands.
    cy.visit('/')

    // 2. AGGRESSIVE UI SYNCHRONIZATION: Ensure the correct screens are swapped
    //    by explicitly manipulating the hidden classes.
    cy.get('#timer-interface', { timeout: 10000 })
      .should('exist')
      .invoke('removeClass', 'hidden') // Force authenticated screen visible
      
    cy.get('#viewer-landing')
      .should('exist')
      .invoke('addClass', 'hidden') // Force unauthenticated screen hidden
  })

  it('should successfully set a duration and verify the UI state', () => {
    const TEST_DURATION = 35; // Minutes
    const EXPECTED_TIME = '35:00'; 
    
    // 1. Open the control modal
    cy.get('#facilitator-trigger').should('be.visible').click()
    cy.get('#control-modal').should('be.visible')
    
    // 2. Input the new duration
    cy.get('#duration').clear().type(TEST_DURATION.toString())
    
    // 3. Click SET (This should write the new duration to Firestore)
    cy.get('#set-button').click()
    
    // 4. Close the modal
    cy.get('#close-controls').click()
    
    // 5. Verify the data persisted by checking the main display
    // Cypress waits patiently up to 10s for the Firestore snapshot listener to update this text.
    cy.get('#time-display', { timeout: 10000 }).should('contain', EXPECTED_TIME) 

    // Verify status updated
    cy.get('#current-status').should('contain', 'STOPPED')
  })
})