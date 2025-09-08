import { readFileSync } from 'node:fs';
import express from 'express';
import ollama from 'ollama';
import { randomInt } from 'crypto';

import { User } from './user.js';

const MODEL = 'smollm';

const PORT = 8000;
const app = express();
app.use(express.json());

const REPL_FILE = "./repl.sh";
const REPL_SCRIPT = readFileSync(REPL_FILE);

// map 'username -> User'
let users = new Map();

app.get('/', (req, res) => {
    res.type('text/plain');
    res.send(REPL_SCRIPT);
});

app.post('/login', (req, res) => {
    let username = req.body?.username;
    if (typeof username !== 'string') {
        return res.status(400).type('text/plain').send('invalid username');
    }

    // Trim whitespace and convert to lowercase
    username = username.trim().toLowerCase();
    if (username === '') {
        username = 'guest';
    }

    console.log(`user logged in: ${username}`);

    // Create a new user if it doesn't exist
    if (!users.has(username)) {
        console.log(`created new user`);
        users.set(username, new User());
    }

    // Respond with normalized username
    res.send(username);
});

/**
 * 1. Basic chat:
 * 
 * request: {
 *   "username": "fox",
 *   "data": "hi llm, how are you"
 * }
 * 
 * 2. Commands:
 * 
 * request: {
 *   "username": "fox",
 *   "data": ".help"
 * }
 */
app.post('/eval', async (req, res) => {
    console.log(req.body);

    const username = req.body?.username;
    const msg = req.body?.msg;

    // Input validation:
    // - username disallows undefined/null/empty string/0
    // - msg disallows undefined/null
    if (!username || typeof username !== 'string' || !users.has(username)) {
        return res.status(400).type('text/plain').send('malformed username');
    } else if (!users.has(username)) {
        return res.status(400).type('text/plain').send('user not found');
    } else if (typeof msg !== 'string') {
        return res.status(400).type('text/plain').send('missing msg');
    }

    console.log(
        `Got message:
                - ip: ${req.ip}
                - username: ${username}
                - message: ${msg}`
    );

    // Parse commands (TODO)
    if (msg === '.help') {
        return res.send('example help text');
    }

    // Get message history from user
    let user = users.get(username);
    let messages = user.pushUserMessage(msg);

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
        res.write(part.message.content);

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
        res.write(`\n(done in ${seconds.toFixed(3)} seconds)`);
    }

    // Add final response to message history
    user.pushLLMMessage(finalResponse);
    res.end();
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});