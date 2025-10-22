// Initialize Firebase using the config block from index.html
// NOTE: firebaseConfig is defined in index.html and must contain your actual project keys
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- GLOBALS AND DOM ELEMENTS ---
let projectCode = null;
let isFacilitator = false; // State for client-side UX only.
let countdownInterval = null;
const MAX_DURATION_MINUTES = 60;
const REQUIRED_DOMAIN = '@knowinnovation.com'; // Kept for reference, not security.

// Get elements
const statusMessageEl = document.getElementById('status-message');
const loginButton = document.getElementById('login-button');      
const projectInfoEl = document.getElementById('project-info');
const timeDisplayEl = document.getElementById('time-display');
const statusDisplayEl = document.getElementById('current-status');
const controlPanelEl = document.getElementById('control-panel');
const viewerLandingEl = document.getElementById('viewer-landing');
const timerInterfaceEl = document.getElementById('timer-interface');
const codeInputEl = document.getElementById('project-code-input');
const goButton = document.getElementById('go-button');

const setButton = document.getElementById('set-button');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const stopButton = document.getElementById('stop-button');
const durationInput = document.getElementById('duration');


// --- UTILITY FUNCTIONS ---

function formatTime(totalSeconds) {
    const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
    const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
}

function calculateTimeRemaining(timerState) {
    const { status, durationSeconds, startTime, remainingAtPause } = timerState;
    
    if (durationSeconds == null) return 0;
    
    if (status === 'running' && startTime) {
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
    timeDisplayEl.textContent = formatTime(secondsLeft);
    statusDisplayEl.textContent = timerState.status.toUpperCase();
    
    if (secondsLeft === 0 && timerState.status !== 'stopped') {
        statusDisplayEl.textContent = 'TIME UP!';
        timeDisplayEl.textContent = '00:00';
    }

    if (timerState.status === 'running') {
        const startTimeMillis = timerState.startTime.toMillis();
        
        countdownInterval = setInterval(() => {
            const elapsed = (Date.now() - startTimeMillis) / 1000;
            secondsLeft = timerState.durationSeconds - elapsed;
            
            if (secondsLeft <= 0) {
                timeDisplayEl.textContent = '00:00';
                statusDisplayEl.textContent = 'TIME UP!';
                clearInterval(countdownInterval);
            } else {
                timeDisplayEl.textContent = formatTime(secondsLeft);
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

setButton.addEventListener('click', () => {
    const durationMinutes = parseInt(durationInput.value);
    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
        alert(`Please enter a valid duration between 1 and ${MAX_DURATION_MINUTES} minutes.`);
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

startButton.addEventListener('click', async () => {
    const doc = await db.collection('timers').doc(projectCode).get();
    const currentTimer = doc.data();
    
    if (!currentTimer || currentTimer.status === 'running') return;

    let newStartTime = firebase.firestore.Timestamp.now();
    let durationToStartFrom = currentTimer.durationSeconds || (10 * 60); 

    if (currentTimer.status === 'paused' && currentTimer.remainingAtPause != null) {
         durationToStartFrom = currentTimer.remainingAtPause;
    } 
    
    updateTimerState({
        status: 'running',
        startTime: newStartTime,
        durationSeconds: durationToStartFrom,
        remainingAtPause: null 
    });
});

pauseButton.addEventListener('click', async () => {
    const doc = await db.collection('timers').doc(projectCode).get();
    const currentTimer = doc.data();
    
    if (currentTimer && currentTimer.status === 'running') {
        const timeRemaining = calculateTimeRemaining(currentTimer);
        
        updateTimerState({
            status: 'paused',
            remainingAtPause: timeRemaining,
            startTime: null 
        });
    }
});

stopButton.addEventListener('click', async () => {
    const doc = await db.collection('timers').doc(projectCode).get();
    const currentTimer = doc.data();
    
    const durationToReset = currentTimer.durationSeconds || (10 * 60); 

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
        alert("Please enter a valid 4-digit project code.");
    }
});


// --- INITIALIZATION AND ROUTING ---

function startTimerInterface(code) {
    projectCode = code;
    timerInterfaceEl.classList.remove('hidden'); 
    viewerLandingEl.classList.add('hidden'); 

    projectInfoEl.textContent = `Project Code: ${projectCode}`;

    db.collection('timers').doc(projectCode)
        .onSnapshot((doc) => {
            const timerState = doc.data();
            
            if (!doc.exists || !timerState) {
                timeDisplayEl.textContent = 'Awaiting Setup...';
                statusDisplayEl.textContent = isFacilitator ? 'Click SET above to create timer.' : 'Ask a facilitator to set the timer.';
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
    const path = window.location.pathname.split('/').pop();

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
        projectInfoEl.innerHTML = `<h2 style="color:red;">Error: Invalid URL.</h2>`;
        statusDisplayEl.textContent = '';
        timeDisplayEl.textContent = 'ERR';
    }
}


// ... (All code before the AUTHENTICATION FLOW section remains the same)

// --- AUTHENTICATION FLOW (The Final Debug Version) ---

// Re-usable function to update UI/State and perform routing
function initializeAppWithAuth(user) {
    console.log("2. Auth state processed. User:", user ? user.uid : "null");
    clearInterval(countdownInterval);
    
    // Set up state based on the resolved 'user' object (either from redirect or persistence)
    if (user) {
        // Logged In
        isFacilitator = true; 
        statusMessageEl.innerHTML = `Signed in as: <strong>${user.email}</strong> (Controls shown. Server enforces permissions.)`;
        loginButton.textContent = 'Sign out';
        loginButton.onclick = () => { auth.signOut(); }; 
        controlPanelEl.classList.remove('hidden');
    } else {
        // Signed Out
        isFacilitator = false;
        statusMessageEl.textContent = 'Viewer Mode.'; 
        loginButton.textContent = 'Sign in with Google (Facilitator)';
        loginButton.onclick = standardSignIn;
        controlPanelEl.classList.add('hidden');
    }
    
    // 3. Only route after the authentication state has been fully determined (on the first load).
    if (!hasRouted) {
        console.log("3. Routing application.");
        routeApp();
        hasRouted = true;
    }
}


// Standard login action switched to redirect (mobile fix)
const standardSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account','hd': 'kitimer-live.web.app/auth-callback.html' });
    auth.signInWithRedirect(provider); 
};


// Button click listener uses the standardSignIn function
loginButton.addEventListener('click', standardSignIn);


// A flag to ensure we only route the first time after auth is checked
let hasRouted = false; 

// 🔑 CRITICAL FIX: The logic is now entirely promise-based. 
// We chain persistence, redirect result, and then check for an existing session.
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("Firebase Auth Persistence set to SESSION for redirect reliability."); // LINE 298 (Debug 1)

        // Step 1: Check for the redirect result first. This handles the login return.
        return auth.getRedirectResult();
    })
    .then((result) => {
        // --- NEW DEBUG LOGS START ---
        console.log("DEBUG: getRedirectResult() resolved.");
        console.log("DEBUG: Result object:", result); 
        console.log("DEBUG: Result user object:", result ? result.user : 'null');
        // --- NEW DEBUG LOGS END ---
        
        if (result && result.user) {
            // CASE A: Successfully resolved the redirect user (login success). 
            console.log("1. Redirect sign-in successful. User:", result.user.email);
            // Use the resolved user to initialize the app IMMEDIATELY.
            initializeAppWithAuth(result.user);
            
        } else {
            // CASE B: No redirect user found (fresh load OR old persistent session).
            
            // Check for a current user in persistent storage and initialize.
            const user = auth.currentUser;
            
            if (user) {
                // Persistent session found (User was logged in before the page load)
                initializeAppWithAuth(user);
            } else {
                // No session and no redirect result (Fresh load/signed out)
                initializeAppWithAuth(null);
            }
        }
    })
    .catch((error) => {
        // This catch block handles errors from setPersistence AND getRedirectResult
        console.error("Authentication Initialization Error:", error);
        statusMessageEl.textContent = `Login failed: ${error.message}`;
        
        // Ensure the app starts in viewer mode even if initialization fails.
        initializeAppWithAuth(null);
    });