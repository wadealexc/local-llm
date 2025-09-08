import express from 'express'
import ollama from 'ollama'
import { randomInt } from 'crypto'

const MODEL = 'smollm'
const USER_ROLE = 'user'
const LLM_ROLE = 'assistant'

const PORT = 8000
const app = express()
app.use(express.json())

let sessions = new Map()

app.get('/', (req, res) => {
    res.type('text/plain')
    const script = `#!/bin/bash
set -euo pipefail

# ANSI colors
GREEN="\\033[0;32m"
CYAN="\\033[0;36m"
RESET="\\033[0m"

if ! command -v jq >/dev/null; then
    echo "This REPL needs jq. Try: sudo apt install -y jq" >&2
    exit 1
fi

SERVER="http://oak.lan:8000"

# Create a new session id
SESSION_ID="$(curl -sS oak.lan:8000/new-session)"
echo -e "Now chatting with \${CYAN}smollm\${RESET} (via oak.lan) | SESSION_ID: \${SESSION_ID}"

while true; do
    # Read user input
    read -er -p "$(echo -e "\${GREEN}(you) > \${RESET}")" prompt

    payload="$(jq -n --arg sessionId "$SESSION_ID" --arg msg "$prompt" \
        '{sessionId:$sessionId, msg:$msg}')"

    # Send input to server and get response
    response="$(curl -fsS -X POST "$SERVER/chat" \
        -H "Content-Type: application/json" \
        --data "$payload")"

    # Print model reply
    echo -e "\${CYAN}(smollm) >\${RESET} \${response}"
done
`
    res.send(script)
})

app.get('/new-session', (req, res) => {
    const sessionId = randomInt(1, 1_000_001).toString()
    console.log(`New session created for ${req.ip}: ${sessionId}`)

    // Create a new session with empty message history
    sessions.set(sessionId, [])

    res.send(sessionId)
})

app.post('/chat', async (req, res) => {
    console.log(req.body)

    // Fetch message history from sessionId
    let sessionId
    let messages
    if ((sessionId = req.body?.sessionId) !== undefined && sessionId !== null) {
        messages = sessions.get(sessionId)
    } else {
        res.send('invalid session id')
        return
    }

    let msg
    if ((msg = req.body?.msg) !== undefined && msg !== null) {
        messages.push({ role: 'user', content: msg })

        console.log(
            `Got message:
                - ip: ${req.ip}
                - sessionId: ${sessionId}
                - message: ${msg}`
        )

        const response = await ollama.chat({
            model: MODEL,
            messages: messages,
            stream: true,
        })

        let finalResponse = ''
        for await (const part of response) {
            finalResponse += part.message.content
            process.stdout.write(part.message.content)
        }

        console.log("\n... done.")

        messages.push({ role: LLM_ROLE, content: finalResponse })
        res.send(finalResponse)
    }
})

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})