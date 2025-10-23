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

// Get elements
const statusMessageEl = document.getElementById('status-message');
const facilitatorTrigger = document.getElementById('facilitator-trigger'); // Discreet icon trigger
const controlModal = document.getElementById('control-modal'); // Modal/Overlay for controls
const closeModalButton = document.getElementById('close-controls');
const logoutButton = document.getElementById('logout-button'); // Sign out button inside modal
const authStatusInfoEl = document.getElementById('auth-status-info'); // Displays user info in modal
const modalTimeDisplayEl = document.getElementById('modal-time-display'); // To show time inside the modal

const projectInfoEl = document.getElementById('project-info');
const timeDisplayEl = document.getElementById('time-display');
const statusDisplayEl = document.getElementById('current-status');
const controlPanelEl = document.getElementById('control-panel');
const viewerLandingEl = document.getElementById('viewer-landing');
const timerInterfaceEl = document.getElementById('timer-interface');
const codeInputEl = document.getElementById('project-code-input');
const goButton = document.getElementById('go-button');

const setButton = document.getElementById('set-button');
const toggleButton = document.getElementById('toggle-button');
const resetButton = document.getElementById('reset-button');
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
    
    // --- Initial UI State Management ---
    const formattedTime = formatTime(secondsLeft);
    
    timeDisplayEl.textContent = formattedTime;
    statusDisplayEl.textContent = timerState.status.toUpperCase();
    
    if (secondsLeft === 0 && timerState.status !== 'stopped') {
        statusDisplayEl.textContent = 'TIME UP!';
        timeDisplayEl.textContent = formatTime(0);
    }
    
    // Update Modal Time Display
    if (modalTimeDisplayEl) {
        modalTimeDisplayEl.textContent = formattedTime;
    }
    
    // Update Facilitator Controls UI
    if (isFacilitator) {
        if (timerState.status === 'running') {
            toggleButton.textContent = 'PAUSE';
            toggleButton.classList.remove('start-style');
            toggleButton.classList.add('pause-style');
            toggleButton.innerHTML = '<i class="fas fa-pause"></i> PAUSE';
        } else {
            toggleButton.textContent = 'START';
            toggleButton.classList.remove('pause-style');
            toggleButton.classList.add('start-style');
            toggleButton.innerHTML = '<i class="fas fa-play"></i> START';
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
                if (modalTimeDisplayEl) modalTimeDisplayEl.textContent = currentFormattedTime;
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
        alert("Action Failed: You may not have permission to control the timer. Please ensure you are a signed-in facilitator.");
        console.error("Firestore update failed (Permission Denied likely):", error);
    }
}

// --- Event Listeners for Control Buttons ---

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

toggleButton.addEventListener('click', async () => {
    const doc = await db.collection('timers').doc(projectCode).get();
    const currentTimer = doc.data();

    if (!currentTimer || currentTimer.status === 'stopped' || currentTimer.status === 'paused') {
        // ACTION: START
        
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

    // TWEAK 2 FIX: Just show the 4-digit code in the top left
    projectInfoEl.textContent = `${projectCode}`;

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

function routeApp() {
    const pathSegments = window.location.pathname.split('/');
    const path = pathSegments.pop() || pathSegments.pop();

    if (!path || path === 'index.html') {
        viewerLandingEl.classList.remove('hidden');
        timerInterfaceEl.classList.add('hidden');
    } else if (path.match(/^\d{4}$/)) {
        startTimerInterface(path);
    } else {
        viewerLandingEl.classList.add('hidden');
        timerInterfaceEl.classList.remove('hidden');
        projectInfoEl.innerHTML = `<h2 style="color:red;">Error: Invalid Project Code in URL.</h2>`;
        statusDisplayEl.textContent = '';
        timeDisplayEl.textContent = 'ERR';
        clearInterval(countdownInterval);
    }
}


// --- FACILITATOR UI LOGIC ---

function toggleControlModal(show) {
    if (show && isFacilitator) {
        controlModal.classList.remove('hidden');
    } else {
        controlModal.classList.add('hidden');
    }
}

if (facilitatorTrigger) {
    facilitatorTrigger.addEventListener('click', () => {
        if (isFacilitator) {
            toggleControlModal(true);
        } else {
            standardSignIn();
        }
    });
}

if (closeModalButton) {
    closeModalButton.addEventListener('click', () => toggleControlModal(false));
}


// --- AUTHENTICATION FLOW ---

const standardSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); 
    auth.signInWithRedirect(provider); 
};


function initializeAppWithAuth(user) {
    console.log("2. Auth state processed. User:", user ? user.uid : "null");
    clearInterval(countdownInterval);
    
    if (user) {
        isFacilitator = true; 
        authStatusInfoEl.innerHTML = `Signed in as: <strong>${user.email}</strong>`;
        
        // FIX: Correctly sign out and reset app state
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign out';
        logoutButton.onclick = () => { 
            auth.signOut().then(() => {
                toggleControlModal(false);
                initializeAppWithAuth(null); // Force reset of application state and UI
            }).catch(error => {
                console.error("Sign out error:", error);
                initializeAppWithAuth(null); 
            }); 
        }; 
    } else {
        isFacilitator = false;
        authStatusInfoEl.textContent = 'Facilitator Sign In Required';
        logoutButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign in with Google';
        logoutButton.onclick = standardSignIn;
        toggleControlModal(false);
    }
    
    if (!hasRouted) {
        console.log("3. Routing application.");
        routeApp();
        hasRouted = true;
    }
}


let hasRouted = false; 

auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("Firebase Auth Persistence set to SESSION for redirect reliability.");
        return auth.getRedirectResult();
    })
    .then((result) => {
        
        if (result && result.user) {
            console.log("1. Redirect sign-in successful. User:", result.user.email);
            initializeAppWithAuth(result.user);
            
        } else {
            const user = auth.currentUser;
            
            if (user) {
                initializeAppWithAuth(user);
            } else {
                initializeAppWithAuth(null);
            }
        }
    })
    .catch((error) => {
        console.error("Authentication Initialization Error:", error);
        initializeAppWithAuth(null);
    });