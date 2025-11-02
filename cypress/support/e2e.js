// cypress/support/e2e.js

// 💡 IMPORTANT: These global variables must be exposed by script.js 
// for Cypress to access them (e.g., via `var auth;`).

// --- GLOBAL CLEANUP HOOK ---
beforeEach(() => {
    // 1. Clear Firestore data using the task registered in cypress.config.js
    cy.log('Clearing Firestore and Auth Emulators...');
    cy.task('clearFirestore'); 
    
    // 2. Clear Firebase Auth users and state using the task registered in cypress.config.js
    cy.task('clearAuth'); 
    
    // 3. Clear browser state
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.log('Emulators and browser state cleared.');
});

// --- CYPRESS CUSTOM LOGIN COMMAND ---
Cypress.Commands.add('login', (uid = 'facilitator-test-user-1') => {
  
    // 1. Visit the page and set emulator environment variables early.
    cy.visit('/', {
        onBeforeLoad(win) {
            // Set global variables to force Firebase SDK to connect to emulators instantly
            win.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
            win.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
            // Also set localStorage keys for compatibility
            win.localStorage.setItem('firebase:hostnames:auth', '127.0.0.1:9099');
            win.localStorage.setItem('firebase:hostnames:firestore', '127.0.0.1:8080');
        },
    }); 

    // 2. Initialize the Client SDK and wait for the 'auth' object to be present.
    cy.window({ timeout: 15000 })
        .should(win => {
            // Check that the necessary deferred function exists
            expect(win.initializeClientSDK).to.be.a('function');
        })
        .then(win => {
            // Call the initialization function and explicitly wait for the Promise it returns.
            return cy.wrap(win.initializeClientSDK(), { timeout: 15000 });
        });

    // 💡 CRITICAL FIX: Wait for the global 'auth' object to exist on the window
    // (guarantees the SDK initialization is fully complete).
    cy.window({ timeout: 10000 }).should('have.property', 'auth')

    // 3. Generate the test token (runs in Node.js)
    cy.task('createTestUserToken', uid).then(token => {

        // 4. Sign in using the now guaranteed-present window.auth instance.
        return cy.window().then(win => {
            // NOTE: win.auth is guaranteed to exist by the previous command.
            return win.auth.signInWithCustomToken(token)
                .then(() => {
                    cy.log(`Successfully signed in test user: ${uid}`);
                });
        });
    });
});
