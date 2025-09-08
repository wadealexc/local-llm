import { readFileSync } from 'node:fs';
import express from 'express';
import ollama from 'ollama';
import { randomInt } from 'crypto';

const MODEL = 'smollm';
const USER_ROLE = 'user';
const LLM_ROLE = 'assistant';

const PORT = 8000;
const app = express();
app.use(express.json());

const REPL_FILE = "./repl.sh";
const REPL_SCRIPT = readFileSync(REPL_FILE);

let sessions = new Map();

app.get('/', (req, res) => {
    res.type('text/plain');
    res.send(REPL_SCRIPT);
});

app.get('/new-session', (req, res) => {
    const sessionId = randomInt(1, 1_000_001).toString();
    console.log(`New session created for ${req.ip}: ${sessionId}`);

    // Create a new session with empty message history
    sessions.set(sessionId, []);

    res.send(sessionId);
});

app.post('/chat', async (req, res) => {
    // console.log(req.body);

    const sessionId = req.body?.sessionId;
    const msg = req.body?.msg;
    // const model = req.body?.model || DEFAULT_MODEL;

    // Input validation:
    // - sessionId disallows undefined/null/empty string/0
    // - msg disallows undefined/null
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).type('text/plain').send('invalid session id');
    } else if (typeof msg !== 'string') {
        return res.status(400).type('text/plain').send('missing msg');
    }

    // Get message history from sessionId, and push new message to history
    let messages = sessions.get(sessionId);
    messages.push({ role: USER_ROLE, content: msg });

    console.log(
        `Got message:
                - ip: ${req.ip}
                - sessionId: ${sessionId}
                - message: ${msg}`
    );

    // Stream response from model
    const response = await ollama.chat({
        model: MODEL,
        messages: messages,
        stream: true,
    });

    let totalDuration;
    let finalResponse = '';
    for await (const part of response) {
        finalResponse += part.message.content;
        process.stdout.write(part.message.content);

        // loadDuration = part.load_duration;
        // evalDuration = part.eval_duration;
        totalDuration = part.total_duration;
    }

    // Output total duration in seconds
    if (typeof totalDuration !== 'number') {
        console.log("\n... done.");
        console.log(`totalDuration is not number. Got: ${totalDuration}`);
    } else {
        const seconds = Number(totalDuration) / 1e9;
        console.log(`\n... done (took ${seconds.toFixed(3)} s)`);
    }

    // Send response to client
    messages.push({ role: LLM_ROLE, content: finalResponse });
    res.send(finalResponse);
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});