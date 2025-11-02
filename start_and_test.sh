#!/bin/bash
# --- CONFIGURATION (Copy from setup_cypress.sh) ---
CYPRESS_PORT=5000
FIREBASE_PROJECT="kitimer-live"

# Define colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display a step message
step() {
  echo -e "\n\n${CYAN}================================================"
  echo -e "🚀 $1"
  echo -e "================================================${NC}"
}

# Function to safely kill emulators (for cleanup)
kill_emulators() {
  pkill -f 'firebase emulators:start'
  wait 5 # Give it a moment to stop
}

# --- 1. START EMULATORS ---
step "1. Starting Firebase Emulators in Background"
# Note: Since the Dev Container feature is expected to set up Java,
# we don't need to source the path here.
firebase emulators:start --only hosting,auth,firestore --project $FIREBASE_PROJECT --debug > firebase_emulators.log 2>&1 &

EMULATOR_PID=$!
echo -e "${GREEN}Emulators starting (PID: ${EMULATOR_PID}). Check firebase_emulators.log.${NC}"

# --- 2. WAIT FOR EMULATORS TO BE READY ---
step "2. Waiting for Firebase Hosting Emulator (Port ${CYPRESS_PORT}) to be ready"
npx --yes wait-on "http://localhost:${CYPRESS_PORT}" --timeout 300000 --interval 2000

if [ $? -ne 0 ]; then
    echo -e "\n\n${RED}‼️ ERROR: Emulators failed to start.${NC}"
    kill ${EMULATOR_PID} # Attempt to kill the failed process
    exit 1
fi

echo -e "${GREEN}✅ Emulators are ready.${NC}"

# --- 3. RUN CYPRESS TESTS ---
step "3. Running Cypress Tests (Headless)"
# Execute the Cypress tests now that the server is confirmed running
npx cypress run 
CYPRESS_EXIT_CODE=$?

# --- 4. CLEANUP ---
step "4. Stopping Emulators"
kill ${EMULATOR_PID}
# Wait for the background process to actually stop
wait ${EMULATOR_PID} 2>/dev/null 

echo -e "${GREEN}Test execution complete. Exiting with code ${CYPRESS_EXIT_CODE}.${NC}"
exit $CYPRESS_EXIT_CODE