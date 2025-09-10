#!/bin/bash
set -euo pipefail

SERVER="http://oak.lan:8000"
USERNAME=""
CURRENT_MODEL=""

# ANSI colors
RED="\033[0;31m"
GREEN="\033[0;32m"
MAGENTA="\033[0;35m"
CYAN="\033[0;36m"
RESET="\033[0m"

# Check for jq
if ! command -v jq >/dev/null; then
    echo "This REPL needs jq. Try: sudo apt install -y jq" >&2
    exit 1
fi

# Helper for printing `(system) >` in red
function as_system {
    echo -en "${RED}(system) >${RESET}"
}

# Print `($USERNAME) >` in green
function as_user {
    echo -en "${GREEN}(${USERNAME}) >${RESET}"
}

# Print `($CURRENT_MODEL) >` in cyan
function as_model {
    echo -en "${CYAN}(${CURRENT_MODEL}) >${RESET}"
}

# clear terminal
clear -x

# Prompt for username. If non-empty, set as $USERNAME
read -er -p "enter name (or leave blank for guest): " user_input
if [[ -n $user_input ]]; then
    USERNAME=$user_input
fi

# JSON payload with { "username": "X" }
uname_payload="$(jq -n --arg username "${USERNAME}" \
    '{username:$username}')"

# Login and get normalized username
USERNAME="$(curl -fsSL -X POST "${SERVER}/login" \
    -H "Content-Type: application/json" \
    --data "${uname_payload}")"

# Re-generate username payload in case of username normalization
uname_payload="$(jq -n --arg username "${USERNAME}" \
    '{username:$username}')"

# Get current model
CURRENT_MODEL="$(curl -fsSL "${SERVER}/model" \
    -H "Content-Type: application/json" \
    --data "${uname_payload}")"

# Hello, user!
# - clear terminal
# - print greeter
# - display available commands
echo -e "$(as_system) hello, ${USERNAME}!"
echo -e "$(as_system) 🌳 welcome to ${MAGENTA}treehouse.repl${RESET} 🌳"
echo -e "$(as_system) type anything to chat with the default model (${CYAN}${CURRENT_MODEL}${RESET}), or enter a command:"
echo -e " ${CYAN}.help${RESET}  - display available commands"
echo -e " ${CYAN}.login${RESET} - sign in to your user to access chat history"

while true; do
    # Read user input
    read -er -p "$(echo -e "$(as_user) ")" prompt

    # Format JSON payload
    payload="$(jq -n --arg username "${USERNAME}" --arg msg "${prompt}" \
        '{username:$username, msg:$msg}')"

    # Send input to server and get response
    as_model
    curl -fsSLN -X POST "${SERVER}/chat" \
        -H "Content-Type: application/json" \
        --data "${payload}"
    echo ""
done