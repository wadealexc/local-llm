import { readFileSync } from 'node:fs';
import express from 'express';
import ollama from 'ollama';
import { randomInt } from 'crypto';

import { User } from './user.js';
import { Model } from './model.js';

const MODEL = 'smollm2';
const MODELS = [
    'qwen3:4b',
    'smollm2',
    'smollm'
];

const HOST = 'http://oak.lan';
const PORT = 8000;
const app = express();
app.use(express.json());

const REPL_FILE = "./repl.sh";
const REPL_SCRIPT = readFileSync(REPL_FILE);

// map 'username -> User'
let users = new Map();

// Get loaded models
let rawModels = (await ollama.list()).models;
if (rawModels.length === 0) {
    console.log('No models found.');
    process.exit(1);
}

let models = [];
console.log(`Loaded ${rawModels.length} models:`);
for (const model of rawModels) {
    let info = await ollama.show({ model: model.model });
    let sysPrompt = genSystemPrompt(model.model);
    models.push(new Model(model, info, sysPrompt));

    console.log(` - ${model.name} (${info.capabilities})`);
}

// Set default model
let preferredDefaultModel = 'qwen3:4b'
let defaultModel = models.find(m => m.name === preferredDefaultModel);
if (!defaultModel) {
    console.log(`Default model ${preferredDefaultModel} not found; using ${models[0].name} instead.`);
    defaultModel = models[0];
}

console.log(`Using default model ${defaultModel.name}. Default system prompt:`);
console.log(defaultModel.systemPrompt);

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

    // Create a new user if it doesn't exist
    if (!users.has(username)) {
        console.log(`created new user: ${username}`);
        users.set(username, new User(username, defaultModel));
    }

    // Get the user's default model
    let modelName = users.get(username).model?.name;
    if (typeof modelName !== 'string') {
        return res.status(500).type('text/plain').send(`user ${username} does not have a valid model loaded`);
    }

    console.log(`user logged in: ${username}`);
    console.log(` - using model: ${modelName}`);

    // Respond with normalized username
    res.send({
        'username': username,
        'modelName': modelName
    });
});

app.post('/model', (req, res) => {
    let username = req.body?.username;
    if (!username || typeof username !== 'string') {
        return res.status(400).type('text/plain').send('malformed username');
    } else if (!users.has(username)) {
        return res.status(400).type('text/plain').send(`user ${username} not found`);
    }

    console.log(`user calls /model: ${username}`);

    let modelName = users.get(username).model?.name;
    if (typeof modelName !== 'string') {
        return res.status(500).type('text/plain').send(`user ${username} does not have a valid model loaded`);
    }

    console.log(` - found model: ${modelName}`);

    // Respond with name of current model
    res.send(modelName);
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
app.post('/chat', async (req, res) => {
    console.log(req.body);

    const username = req.body?.username;
    const msg = req.body?.msg;

    // Input validation:
    // - username disallows undefined/null/empty string/0
    // - msg disallows undefined/null
    if (!username || typeof username !== 'string') {
        return res.status(400).type('text/plain').send('malformed username');
    } else if (!users.has(username)) {
        return res.status(400).type('text/plain').send(`user ${username} not found`);
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

function genSystemPrompt(modelName) {
    let now = new Date();
    let dateString = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    return `You are ${modelName}, a self-hosted language model running on ${HOST}.
Current date: ${dateString}

Personality:
You are a capable, thoughtful, and precise assistant. Your goal is to understand the user's intent, ask clarifying questions when needed, think step-by-step through problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences.`;
}