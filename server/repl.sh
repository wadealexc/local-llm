#!/bin/bash
set -euo pipefail

# ANSI colors
GREEN="\033[0;32m"
CYAN="\033[0;36m"
RESET="\033[0m"

if ! command -v jq >/dev/null; then
    echo "This REPL needs jq. Try: sudo apt install -y jq" >&2
    exit 1
fi

SERVER="http://oak.lan:8000"

# Create a new session id
SESSION_ID="$(curl -sS oak.lan:8000/new-session)"
echo -e "Now chatting with ${CYAN}smollm${RESET} (via oak.lan) | SESSION_ID: ${SESSION_ID}"

while true; do
    # Read user input
    read -er -p "$(echo -e "${GREEN}(you) > ${RESET}")" prompt

    payload="$(jq -n --arg sessionId "$SESSION_ID" --arg msg "$prompt" \
        '{sessionId:$sessionId, msg:$msg}')"

    # Send input to server and get response
    response="$(curl -fsS -X POST "$SERVER/chat" \
        -H "Content-Type: application/json" \
        --data "$payload")"

    # Print model reply
    echo -e "${CYAN}(smollm) >${RESET} ${response}"
done