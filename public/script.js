// Initialize Firebase using the config block from index.html
// NOTE: firebaseConfig is defined in index.html and must contain your actual project keys
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- GLOBALS AND DOM ELEMENTS ---
let projectCode = null;
let isFacilitator = false;
let countdownInterval = null;
const MAX_DURATION_MINUTES = 60;
const REQUIRED_DOMAIN = '@knowinnovation.com'; 

// Get elements
const authStatusEl = document.getElementById('auth-status');
const statusMessageEl = document.getElementById('status-message'); // References <p id="status-message">
const loginButton = document.getElementById('login-button');      // References <button id="login-button">
const timerAppEl = document.getElementById('timer-app');
const projectInfoEl = document.getElementById('project-info');
const timeDisplayEl = document.getElementById('time-display');
const statusDisplayEl = document.getElementById('current-status');
const controlPanelEl = document.getElementById('control-panel');

const setButton = document.getElementById('set-button');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const stopButton = document.getElementById('stop-button');
const durationInput = document.getElementById('duration');


// --- UTILITY FUNCTIONS ---

/**
 * Converts total seconds into MM:SS format.
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
    const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Calculates the current time remaining based on the server state.
 */
function calculateTimeRemaining(timerState) {
    const { status, durationSeconds, startTime, remainingAtPause } = timerState;
    
    if (durationSeconds == null) return 0;
    
    if (status === 'running' && startTime) {
        // Calculate elapsed time from the server's startTime
        const elapsed = (Date.now() - startTime.toMillis()) / 1000;
        return Math.max(0, durationSeconds - elapsed);
    } 
    
    if (status === 'paused' && remainingAtPause != null) {
        return remainingAtPause;
    }
    
    return durationSeconds; 
}

/**
 * Starts the client-side interval to update the screen every second.
 */
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
        }, 1000); // Update every 1 second
    }
}


// --- TIMER CONTROL FUNCTIONS (WRITE OPERATIONS) ---

async function updateTimerState(updates) {
    if (!projectCode || !isFacilitator) {
        alert("Permission Denied: You must be a signed-in facilitator to control the timer.");
        return;
    }
    
    const timerRef = db.collection('timers').doc(projectCode);
    try {
        // We use .update() here, which requires the document to exist
        await timerRef.update(updates);
    } catch (error) {
        alert("Failed to update timer state. Check the console for a security rule or connectivity error.");
        console.error("Firestore update failed:", error);
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
    
    // Use .set without merge: true for initial creation to ensure all fields are present
    // The security rule requires all fields to be present on 'create'
    db.collection('timers').doc(projectCode).set({
        projectCode: projectCode,
        status: 'stopped',
        durationSeconds: durationSeconds,
        remainingAtPause: durationSeconds,
        startTime: null 
    }).catch(error => { // Changed from merge: true back to standard set for simplicity
        alert("Failed to create/set timer. Check permissions.");
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
    const doc = await