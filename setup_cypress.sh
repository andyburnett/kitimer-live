#!/bin/bash

# --- CONFIGURATION ---
CYPRESS_PORT=5000
FIREBASE_PROJECT="kitimer-live"
CYPRESS_CONFIG_FILE="cypress.config.js"
FIREBASE_JSON="firebase.json"
NPM_PACKAGES=("cypress" "firebase-admin")
SYSTEM_DEPS="libgtk2.0-0t64 libgtk-3-0t64 libgbm-dev libnotify-dev libnss3 libxss1 libasound2t64 libxtst6 xauth xvfb"

# Function to display a step message
step() {
  echo -e "\n\n${CYAN}================================================"
  echo -e "🚀 $1"
  echo -e "================================================${NC}"
}

# Define colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- 1. INSTALL SYSTEM DEPENDENCIES (Needed for Cypress) ---
step "1. Installing Linux System Dependencies (Cypress/Xvfb)"
sudo apt-get update && sudo apt-get install -y $SYSTEM_DEPS

# --- 2. INSTALL NODE PACKAGES ---
step "2. Installing Node/NPM Dependencies (Cypress & Firebase Admin)"
npm install "${NPM_PACKAGES[@]}"

# --- 3. CONFIRM/CREATE CYPRESS FILES ---
step "3. Creating Cypress Directory Structure"
mkdir -p cypress/e2e
mkdir -p cypress/support
mkdir -p cypress/plugins

# Create cypress.config.js if it doesn't exist
if [ ! -f "$CYPRESS_CONFIG_FILE" ]; then
    echo -e "${RED}Warning: $CYPRESS_CONFIG_FILE not found. Please ensure it is created and configured correctly.${NC}"
fi

# Create firebase.json if it doesn't exist (to ensure emulators start)
if [ ! -f "$FIREBASE_JSON" ]; then
    echo -e "${RED}Warning: $FIREBASE_JSON not found. Please ensure it is created and configured correctly.${NC}"
fi

# --- 4. START FIREBASE EMULATORS (In Background) ---
step "4. Starting Firebase Emulators (Hosting, Auth, Firestore)"

# Run in background & log output
# We use nohup to detach the process, and '&' to run in the background.
nohup firebase emulators:start --only hosting,auth,firestore --project $FIREBASE_PROJECT > firebase_emulators.log 2>&1 &

# Wait briefly for emulators to start and check the port is forwarded
echo -e "${GREEN}Emulators starting in the background (PID: $!). Check firebase_emulators.log for details.${NC}"
echo -e "${GREEN}Waiting 10 seconds for the hosting port ($CYPRESS_PORT) to be ready...${NC}"
sleep 10
echo -e "${GREEN}Access your app at: http://localhost:$CYPRESS_PORT${NC}"

# --- 5. RUN CYPRESS TESTS ---
step "5. Running Cypress Headless Tests"
npx cypress run

# --- 6. CLEANUP (Optional) ---
# To stop the emulators, you'll need to use the command below manually in the terminal.
echo -e "\n\n${GREEN}Setup complete. Cypress tests have finished.${NC}"
echo -e "To manually stop the Firebase Emulators, run: ${RED}killall node${NC}"