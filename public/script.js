// Initialize Firebase using the config block from index.html
// NOTE: firebaseConfig is defined in index.html and must contain your actual project keys
// It is assumed firebaseConfig is available in the global scope from index.html
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- GLOBALS AND DOM ELEMENTS ---
let projectCode = null;
let isFacilitator = false; // State for client-side UX only.
let countdownInterval = null;
const MAX_DURATION_MINUTES = 60;
const REQUIRED_DOMAIN = '@knowinnovation.com'; // Kept for reference, not security.

// Get elements (UPDATED FOR NEW UI STRUCTURE)
const statusMessageEl = document.getElementById('status-message');
const facilitatorTrigger = document.getElementById('facilitator-trigger'); // NEW: Discreet icon trigger
const controlModal = document.getElementById('control-modal'); // NEW: Modal/Overlay for controls
const closeModalButton = document.getElementById('close-controls'); // NEW
const logoutButton = document.getElementById('logout-button'); // NEW: Sign out button inside modal
const authStatusInfoEl = document.getElementById('auth-status-info'); // NEW: Displays user info in modal
const modalTimeDisplayEl = document.getElementById('modal-time-display'); // NEW: To show time inside the modal

const projectInfoEl = document.getElementById('project-info');
const timeDisplayEl = document.getElementById('time-display');
const statusDisplayEl = document.getElementById('current-status');
const controlPanelEl = document.getElementById('control-panel'); // Remains the container for controls
const viewerLandingEl = document.getElementById('viewer-landing');
const timerInterfaceEl = document.getElementById('timer-interface');
const codeInputEl = document.getElementById('project-code-input');
const goButton = document.getElementById('go-button');

const setButton = document.getElementById('set-button');
const toggleButton = document.getElementById('toggle-button'); // NEW: Replaces startButton/pauseButton
const resetButton = document.getElementById('reset-button'); // RENAMED from stopButton
const durationInput = document.getElementById('duration');


// --- UTILITY FUNCTIONS ---

function formatTime(totalSeconds) {
    // If timer runs for over an hour, show HH:MM:SS, otherwise MM:SS
    const totalSecondsInt = Math.floor(Math.max(0, totalSeconds));
    const hours = Math.floor(totalSecondsInt / 3600);
    const minutes = Math.floor((totalSecondsInt % 3600) / 60);
    const seconds = totalSecondsInt % 60;
    const pad = (num) => num.toString().padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}

function calculateTimeRemaining(timerState) {
    const { status, durationSeconds, startTime, remainingAtPause } = timerState;
    
    if (durationSeconds == null) return 0;
    
    if (status === 'running' && startTime) {
        // Firebase Timestamp needs .toMillis()
        const elapsed = (Date.now() - startTime.toMillis()) / 1000;
        return Math.max(0, durationSeconds - elapsed);
    } 
    
    if (status === 'paused' && remainingAtPause != null) {
        return remainingAtPause;
    }
    
    return durationSeconds; 
}

function startClientCountdown(timerState) {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    let secondsLeft = calculateTimeRemaining(timerState);
    
    // --- UI State Management for Viewer Mode ---
    timeDisplayEl.textContent = formatTime(secondsLeft);
    statusDisplayEl.textContent = timerState.status.toUpperCase();
    
    if (secondsLeft === 0 && timerState.status !== 'stopped') {
        statusDisplayEl.textContent = 'TIME UP!';
        timeDisplayEl.textContent = '00:00';
    }
    
    // --- UI State Management for Facilitator Mode (Toggle Button & Modal Time) ---
    const formattedTime = formatTime(secondsLeft);
    
    // Update Modal Time Display
    if (modalTimeDisplayEl) {
        modalTimeDisplayEl.textContent = formattedTime;
    }
    
    if (isFacilitator) {
        if (timerState.status === 'running') {
            toggleButton.textContent = 'PAUSE';
            toggleButton.classList.remove('start-style');
            toggleButton.classList.add('pause-style');
            toggleButton.innerHTML = '<i class="fas fa-pause"></i> PAUSE'; // Icon update
        } else {
            toggleButton.textContent = 'START';
            toggleButton.classList.remove('pause-style');
            toggleButton.classList.add('start-style');
            toggleButton.innerHTML = '<i class="fas fa-play"></i> START'; // Icon update
        }
    }
    // --- END UI State Management ---

    if (timerState.status === 'running') {
        const startTimeMillis = timerState.startTime.toMillis();
        
        countdownInterval = setInterval(() => {
            const elapsed = (Date.now() - startTimeMillis) / 1000;
            secondsLeft = timerState.durationSeconds - elapsed;
            
            const currentFormattedTime = formatTime(secondsLeft);

            if (secondsLeft <= 0) {
                timeDisplayEl.textContent = formatTime(0);
                statusDisplayEl.textContent = 'TIME UP!';
                if (modalTimeDisplayEl) modalTimeDisplayEl.textContent = formatTime(0);
                clearInterval(countdownInterval);
            } else {
                timeDisplayEl.textContent = currentFormattedTime;
                if (modalTimeDisplayEl) modalTimeDisplayEl.textContent = currentFormattedTime; // Update modal time display
            }
        }, 1000); 
    }
}


// --- TIMER CONTROL FUNCTIONS (WRITE OPERATIONS) ---

async function updateTimerState(updates) {
    if (!projectCode) {
        alert("System Error: No project code defined.");
        return;
    }
    
    const timerRef = db.collection('timers').doc(projectCode);
    try {
        await timerRef.update(updates);
    } catch (error) {
        // This catch block handles the PERMISSION_DENIED error from Firestore rules.
        alert("Action Failed: You may not have permission to control the timer. Please ensure you are a signed-in facilitator.");
        console.error("Firestore update failed (Permission Denied likely):", error);
    }
}

// --- Event Listeners for Control Buttons ---

// SET Button
setButton.addEventListener('click', () => {
    const durationMinutes = parseInt(durationInput.value);
    if (isNaN(durationMinutes) || durationMinutes < 1) {
        alert(`Please enter a valid duration of 1 minute or more.`);
        return;
    }
    
    const durationSeconds = durationMinutes * 60; 
    
    db.collection('timers').doc(projectCode).set({
        projectCode: projectCode,
        status: 'stopped',
        durationSeconds: durationSeconds,
        remainingAtPause: durationSeconds,
        startTime: null 
    }).catch(error => {
        alert("Action Failed: You may not have permission to control the timer. Please ensure you are a signed-in facilitator.");
        console.error("Firestore SET failed:", error);
    });
});

// Toggle Button (Start/Pause) Logic
toggleButton.addEventListener('click', async () => {
    const doc = await db.collection('timers').doc(projectCode).get();
    const currentTimer = doc.data();

    if (!currentTimer || currentTimer.status === 'stopped' || currentTimer.status === 'paused') {
        // ACTION: START
        
        // Ensure a duration is set before starting
        if (!currentTimer || currentTimer.durationSeconds == null || currentTimer.durationSeconds === 0) {
            alert("Please set the timer duration before starting.");
            return;
        }

        let newStartTime = firebase.firestore.Timestamp.now();
        let durationToStartFrom = (currentTimer && currentTimer.durationSeconds) || (10 * 60); 

        if (currentTimer && currentTimer.status === 'paused' && currentTimer.remainingAtPause != null) {
             durationToStartFrom = currentTimer.remainingAtPause;
        } 
        
        updateTimerState({
            status: 'running',
            startTime: newStartTime,
            durationSeconds: durationToStartFrom,
            remainingAtPause: null 
        });

    } else if (currentTimer.status === 'running') {
        // ACTION: PAUSE
        const timeRemaining = calculateTimeRemaining(currentTimer);
        
        updateTimerState({
            status: 'paused',
            remainingAtPause: timeRemaining,
            startTime: null 
        });
    }
});


// RESET Button
resetButton.addEventListener('click', async () => {
    const doc = await db.collection('timers').doc(projectCode).get();
    const currentTimer = doc.data();
    
    if (!currentTimer || currentTimer.durationSeconds == null) {
        alert("Cannot reset: Timer duration has not been set.");
        return;
    }

    const durationToReset = currentTimer.durationSeconds; 

    updateTimerState({
        status: 'stopped',
        durationSeconds: durationToReset,
        remainingAtPause: durationToReset, 
        startTime: null 
    });
});


// --- NEW LANDING PAGE LOGIC ---

goButton.addEventListener('click', () => {
    const code = codeInputEl.value.trim();
    if (code && code.match(/^\d{4}$/)) {
        window.location.pathname = `/${code}`;
    } else {
        statusMessageEl.textContent = "Please enter a valid 4-digit project code.";
        statusMessageEl.style.color = 'red';
        setTimeout(() => {
            statusMessageEl.textContent = '';
        }, 5000);
    }
});


// --- INITIALIZATION AND ROUTING ---

function startTimerInterface(code) {
    projectCode = code;
    timerInterfaceEl.classList.remove('hidden'); 
    viewerLandingEl.classList.add('hidden'); 

    projectInfoEl.textContent = `Project: ${projectCode}`;

    db.collection('timers').doc(projectCode)
        .onSnapshot((doc) => {
            const timerState = doc.data();
            
            if (!doc.exists || !timerState || timerState.durationSeconds == null) {
                // Timer is NOT set up for this code
                timeDisplayEl.textContent = '00:00';
                statusDisplayEl.textContent = isFacilitator ? 'Click SET in controls to create timer.' : 'Awaiting Setup...';
                if (modalTimeDisplayEl) modalTimeDisplayEl.textContent = '00:00';
                clearInterval(countdownInterval);
                return;
            }

            startClientCountdown(timerState);
            
        }, (error) => {
            console.error("Firestore snapshot error. Check your security rules/connection.", error);
        });
}

// Router function is run only after auth state is determined
function routeApp() {
    // Get the path segment after the domain, splitting by '/'
    const pathSegments = window.location.pathname.split('/');
    // Get the last non-empty segment, which should be the code
    const path = pathSegments.pop() || pathSegments.pop(); // Handles trailing slashes

    if (!path || path === 'index.html') {
        // CASE 1: URL is root (/) -> Show the landing page
        viewerLandingEl.classList.remove('hidden');
        timerInterfaceEl.classList.add('hidden');
    } else if (path.match(/^\d{4}$/)) {
        // CASE 2: URL has a valid 4-digit code (e.g., /1234) -> Show the timer
        startTimerInterface(path);
    } else {
        // CASE 3: Invalid code in URL
        viewerLandingEl.classList.add('hidden');
        timerInterfaceEl.classList.remove('hidden');
        projectInfoEl.innerHTML = `<h2 style="color:red;">Error: Invalid Project Code in URL.</h2>`;
        statusDisplayEl.textContent = '';
        timeDisplayEl.textContent = 'ERR';
        clearInterval(countdownInterval);
    }
}


// --- FACILITATOR UI LOGIC ---

// Toggles the visibility of the control modal
function toggleControlModal(show) {
    if (show && isFacilitator) {
        controlModal.classList.remove('hidden');
    } else {
        controlModal.classList.add('hidden');
    }
}

// Event listener for the discreet trigger icon (Only exists if timerInterfaceEl is present)
if (facilitatorTrigger) {
    facilitatorTrigger.addEventListener('click', () => {
        if (isFacilitator) {
            // Logged in: show controls
            toggleControlModal(true);
        } else {
            // Not logged in: trigger login
            standardSignIn();
        }
    });
}

// Event listener to close the modal
if (closeModalButton) {
    closeModalButton.addEventListener('click', () => toggleControlModal(false));
}


// --- AUTHENTICATION FLOW ---

// Standard login action switched to redirect (mobile fix)
const standardSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); 
    auth.signInWithRedirect(provider); 
};


// Re-usable function to update UI/State and perform routing (FIXED SIGN-OUT LOGIC)
function initializeAppWithAuth(user) {
    console.log("2. Auth state processed. User:", user ? user.uid : "null");
    clearInterval(countdownInterval);
    
    // Set up state based on the resolved 'user' object
    if (user) {
        // Logged In
        isFacilitator = true; 
        authStatusInfoEl.innerHTML = `Signed in as: <strong>${user.email}</strong>`; // Display user email in modal
        
        // FIX 1: Correctly sign out and reset app state
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign out';
        logoutButton.onclick = () => { 
            auth.signOut().then(() => {
                toggleControlModal(false); // Hide modal immediately
                initializeAppWithAuth(null); // Force reset of application state and UI
            }).catch(error => {
                console.error("Sign out error:", error);
                // Even on error, attempt to reset client-side state
                initializeAppWithAuth(null); 
            }); 
        }; 
    } else {
        // Signed Out
        isFacilitator = false;
        authStatusInfoEl.textContent = 'Facilitator Sign In Required';
        logoutButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign in with Google';
        logoutButton.onclick = standardSignIn;
        toggleControlModal(false); // Ensure modal is hidden
    }
    
    // 3. Only route after the authentication state has been fully determined (on the first load).
    if (!hasRouted) {
        console.log("3. Routing application.");
        routeApp();
        hasRouted = true;
    }
}


// A flag to ensure we only route the first time after auth is checked
let hasRouted = false; 

// 🔑 CRITICAL FIX: The logic is now entirely promise-based. 
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("Firebase Auth Persistence set to SESSION for redirect reliability.");

        // Step 1: Check for the redirect result first. This handles the login return.
        return auth.getRedirectResult();
    })
    .then((result) => {
        
        if (result && result.user) {
            // CASE A: Successfully resolved the redirect user (login success). 
            console.log("1. Redirect sign-in successful. User:", result.user.email);
            initializeAppWithAuth(result.user);
            
        } else {
            // CASE B: No redirect user found (fresh load OR old persistent session).
            
            // Check for a current user in persistent storage and initialize.
            const user = auth.currentUser;
            
            if (user) {
                // Persistent session found
                initializeAppWithAuth(user);
            } else {
                // No session and no redirect result
                initializeAppWithAuth(null);
            }
        }
    })
    .catch((error) => {
        // This catch block handles errors from setPersistence AND getRedirectResult
        console.error("Authentication Initialization Error:", error);
        initializeAppWithAuth(null);
    });