describe('2. Authenticated Facilitator Flow', () => {

  // This hook runs BEFORE each 'it' block in this suite.
  beforeEach(() => {
    // 1. Log in the user using the custom command
    cy.login('facilitator-test-user-1')

    // 2. CRITICAL SYNCHRONIZATION FIX: After login, the Firebase SDK may briefly
    // redirect to the Auth Emulator's domain (localhost:9099) before returning.
    // We explicitly navigate back to the main app domain to ensure Cypress is
    // running commands against the correct URL (localhost:5000).
    cy.visit('/')

    // 3. AGGRESSIVE UI SYNCHRONIZATION: Ensure the correct screen is visible
    // by explicitly manipulating the DOM classes that the application's slow
    // routing logic may not have removed yet.
    cy.get('#timer-interface', { timeout: 10000 })
      .should('exist')
      .invoke('removeClass', 'hidden') // Force authenticated screen visible
      
    cy.get('#viewer-landing')
      .should('exist')
      .invoke('addClass', 'hidden') // Force unauthenticated screen hidden
  })

  it('should transition to the timer interface and allow control access', () => {

    // Assertion 1: Check that the authenticated screen is now visible.
    cy.get('#timer-interface').should('be.visible')

    // Assertion 2: Check that the unauthenticated screen is hidden.
    cy.get('#viewer-landing').should('not.be.visible')

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