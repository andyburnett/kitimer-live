// cypress/e2e/load.cy.js

describe('1. Application Load and Unauthenticated State Check', () => {
  it('should display the project code input and "GO" button on load', () => {
    cy.visit('/') 

    // 1. Assert that the main viewer-landing screen is visible (it is NOT hidden)
    cy.get('#viewer-landing').should('be.visible')

    // 2. Check the primary instruction text
    cy.get('.landing-text').should('contain', 'Enter 4-Digit Project Code')
    
    // 3. Check for the project code input field
    cy.get('#project-code-input').should('be.visible').and('have.attr', 'maxlength', '4')

    // 4. Check for the "GO" button using its specific ID
    cy.get('#go-button').should('be.visible').and('contain', 'GO')
  })
})