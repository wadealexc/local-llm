import express from 'express';
import ollama, { type ModelResponse, type ShowResponse, type Message } from 'ollama';
// import { randomInt } from 'crypto';

import { User } from './user.js';
import { Model } from './model.js';

const MODEL: string = 'smollm2';
// const MODELS = [
//     'qwen3:4b',
//     'smollm2',
//     'smollm'
// ];

const HOST: string = 'http://oak.lan';
const PORT: number = 8000;
const app = express();
app.use(express.json());

// map 'username -> User'
let users: Map<string, User> = new Map();

// Get loaded models
let rawModels: ModelResponse[] = (await ollama.list()).models;
if (rawModels.length === 0) throw new Error('No models loaded.');

let models: Model[] = [];
console.log(`Loaded ${rawModels.length} models:`);
for (const model of rawModels) {
    let info: ShowResponse = await ollama.show({ model: model.model });
    let sysPrompt: string = genSystemPrompt(model.model);
    models.push(new Model(model, info, sysPrompt));

    console.log(` - ${model.name} (${info.capabilities})`);
}

// Set default model
let preferredDefaultModel: string = 'qwen3:4b'
let defaultModel: Model =
    models.find(m => m.name === preferredDefaultModel)
    ?? models[0]
    ?? (() => { throw new Error('(unreachable) No models loaded.'); })();

console.log(`Using default model ${defaultModel.name}. Default system prompt:`);
console.log(defaultModel.systemPrompt);

app.post('/login', (req, res) => {
    // Trim whitespace and convert to lowercase. If we're left with an empty string, use `guest`
    let username: string = (req.body?.username as string)
        .trim()
        .toLowerCase() || 'guest';

    // Create a new user if it doesn't exist
    if (!users.has(username)) {
        console.log(`created new user: ${username}`);
        users.set(username, new User(username, defaultModel));
    }

    let user: User =
        users.get(username)
        ?? (() => { throw new Error('(unreachable) User not found.'); })();

    // Get the user's default model
    let modelName: string = user.model.name;

    console.log(`user logged in: ${username}`);
    console.log(` - using model: ${modelName}`);

    // Respond with normalized username
    res.send({
        'username': username,
        'modelName': modelName
    });
});

app.get('/models', (req, res) => {
    let nameList: string[] = [];
    for (const model of models) {
        nameList.push(model.name);
    }

    res.send({
        "models": nameList
    });
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

    const username: string = req.body?.username as string;
    const msg: string = req.body?.message as string;

    console.log(
        `Got message:
                - ip: ${req.ip}
                - username: ${username}
                - message: ${msg}`
    );

    let user = users.get(username);
    if (!user) {
        console.log(`user ${username} not found`);
        return res.status(400).type('text/plain').send(`user ${username} not found`);
    }

    // Get message history from user
    let messages: Message[] = user.pushUserMessage(msg);

    // Stream response from model
    const response = await ollama.chat({
        model: MODEL,
        messages: messages,
        stream: true,
    });

    let totalDuration: number = 0;
    let finalResponse: string = '';
    for await (const part of response) {
        finalResponse += part.message.content;
        process.stdout.write(part.message.content);
        res.write(part.message.content);

        // loadDuration = part.load_duration;
        // evalDuration = part.eval_duration;
        totalDuration = part.total_duration;
    }

    // Output total duration in seconds
    const seconds: number = Number(totalDuration) / 1e9;
    console.log(`\n... done (took ${seconds.toFixed(3)} s)`);
    res.write(`\n(done in ${seconds.toFixed(3)} seconds)`);

    // Add final response to message history
    user.pushLLMMessage(finalResponse);
    res.end();
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});

function genSystemPrompt(modelName: string): string {
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