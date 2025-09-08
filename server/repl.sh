#!/bin/bash
set -euo pipefail

# ANSI colors
GREEN="\033[0;32m"
CYAN="\033[0;36m"
RESET="\033[0m"

# Create a new session id
SESSION_ID="$(curl -sS oak.lan:8000/new-session)"
echo -e "Now chatting with ${CYAN}smollm${RESET} (via oak.lan) | SESSION_ID: ${SESSION_ID}"

while true; do
    # Read user input
    read -p "$(echo -e "${GREEN}(you) > ${RESET}")" prompt

    # Send input to server and get response
    response="$(curl -sS -X POST oak.lan:8000/chat \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"$SESSION_ID\", \"msg\": \"$prompt\"}")"

    # Print model reply
    echo -e "${CYAN}(smollm) >${RESET} ${response}"
done