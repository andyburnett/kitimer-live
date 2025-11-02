# --- CONFIGURATION ---
CYPRESS_PORT=5000
FIREBASE_PROJECT="kitimer-live"
CYPRESS_CONFIG_FILE="cypress.config.js"
FIREBASE_JSON="firebase.json"

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

# Function to safely kill emulators
kill_emulators() {
  echo -e "${RED}Attempting to stop all running Firebase Emulator processes...${NC}"
  # Use pkill to find and kill processes started by 'firebase emulators:start'
  pkill -f 'firebase emulators:start'
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Emulators stopped successfully.${NC}"
  else
    echo -e "${RED}⚠️ No Firebase Emulator processes found to kill.${NC}"
  fi
}

# --- 0. PRE-CLEANUP ---
kill_emulators

# --- 1. INSTALL SYSTEM DEPENDENCIES (Fallback for Cypress/Xvfb) ---
step "1. Installing Linux System Dependencies (Cypress/Xvfb)"
# We trust the devcontainer feature to handle most, but add this as a safety net
# for common graphical dependencies, resolving the previous Xvfb error.
SYSTEM_DEPS="libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb"

# Use non-interactive mode (-y) and update package lists before installing
sudo apt-get update 
sudo apt-get install -y $SYSTEM_DEPS

# --- 2. INSTALL NODE PACKAGES & CYPRESS BINARY ---
step "2. Installing Node/NPM Dependencies & Cypress Binary"
# Install all packages from package.json
npm install 

# Explicitly install Cypress binary after npm install
npx cypress install

# --- 3. CONFIRM/CREATE CYPRESS FILES ---
step "3. Creating Cypress Directory Structure (If necessary)"
mkdir -p cypress/e2e
mkdir -p cypress/support

if [ ! -f "$CYPRESS_CONFIG_FILE" ]; then
    echo -e "${RED}Warning: $CYPRESS_CONFIG_FILE not found.${NC}"
fi

