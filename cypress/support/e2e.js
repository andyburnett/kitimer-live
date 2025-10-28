// cypress/support/e2e.js

Cypress.Commands.add('login', (uid = 'facilitator-test-user-1') => {
  
  // 1. Visit the page first.
  cy.visit('/'); 
  
  // 2. Poll the window object, waiting for the function to exist.
  // This is the most resilient form of waiting in Cypress.
  cy.window({ timeout: 20000 })
    .should(win => {
        // Assert that the function exists directly on the object.
        expect(win.firebase).to.have.property('initializeApp');
    })
    .then(win => {
        
        // 3. INITIALIZATION: Call the function that we just waited for.
        // We wrap the promise returned by initializeApp to handle asynchronous setup.
        return cy.wrap(win.firebase.initializeApp(win.firebaseConfig), { timeout: 15000 }).then(app => {
            
            // 4. Configure the client to connect to the EMULATORS
            // The service functions (auth, firestore) must be present on the initialized app object.
            const auth = app.auth();
            const firestore = app.firestore();
            
            auth.useEmulator('http://localhost:9099'); 
            firestore.useEmulator('localhost', 8080);

            // 5. Generate the test token (runs in Node.js)
            return cy.task('createTestUserToken', uid).then(token => {
                
                // 6. Sign in and bypass the UI
                return auth.signInWithCustomToken(token)
                    .then(() => {
                        cy.log(`Successfully signed in test user: ${uid}`);
                    })
                    .catch(error => {
                        cy.log(`Firebase Login Failed: ${error.message}`);
                        throw error;
                    });
            });
        });
    });
});