describe('2. Authenticated Facilitator Flow', () => {
  
  // This hook runs BEFORE each 'it' block in this suite.
  beforeEach(() => {
    // This custom command bypasses UI login, signs in a test user 
    // via Firebase Admin SDK, and connects to the Auth Emulator (port 9099).
    cy.login('facilitator-test-user-1') 
  })

  it('should transition to the timer interface and allow control access', () => {
    
    // Assertion 1: Check that the authenticated screen is now visible.
    // The test asserts the 'hidden' class has been REMOVED from the #timer-interface.
    cy.get('#timer-interface').should('exist').and('not.have.class', 'hidden')
    
    // Assertion 2: Check that the unauthenticated screen is hidden.
    cy.get('#viewer-landing').should('have.class', 'hidden')
    
    // Assertion 3: Verify the core timer elements are present.
    cy.get('#time-display').should('contain', '00:00')
    cy.get('#current-status').should('contain', 'STOPPED')
    
    // Assertion 4: Check for the facilitator control button and click it.
    cy.get('#facilitator-trigger').should('be.visible').click()
    
    // Assertion 5: The control modal opens.
    cy.get('#control-modal').should('be.visible')
    
    // Assertion 6: Check a core control element inside the modal.
    cy.get('#set-button').should('contain', 'SET')
  })
})