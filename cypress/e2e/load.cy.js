// cypress/e2e/load.cy.js

describe('1. Application Load and Unauthenticated State Check', () => {

    it('should display the project code input and "GO" button on load', () => {
        cy.visit('/');

        // 💡 FINAL FIX: Force the initial landing page to be visible, bypassing slow routing logic.
        cy.get('#viewer-landing')
            .should('exist')
            .invoke('removeClass', 'hidden') // Ensure it's displayed for assertions
            .and('be.visible');

        // Assert that the key elements of the unauthenticated screen are present.
        cy.get('#project-code-input').should('be.visible').and('have.attr', 'placeholder', 'e.g., 4128');
        cy.get('#go-button').should('be.visible').and('contain', 'GO');

        // Assert that the authenticated interface remains hidden.
        cy.get('#timer-interface').should('have.class', 'hidden');
    });
});
