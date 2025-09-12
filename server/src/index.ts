import express from 'express';
import ollama, { type ModelResponse, type ShowResponse, type Message } from 'ollama';

import * as iface from '@local-llm/protocol';

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

// Get loaded models
let rawModels: ModelResponse[] = (await ollama.list()).models;
if (rawModels.length === 0) throw new Error('No models loaded.');

let models: Model[] = [];
console.log(`Loaded ${rawModels.length} models:`);
for (const model of rawModels) {
    let info: ShowResponse = await ollama.show({ model: model.model });
    models.push(new Model(model, info));

    console.log(` - ${model.name} (${info.capabilities})`);
}

app.get('/models', (req, res) => {
    let response: iface.ModelsResponse = { models: [] }

    for (const model of models) {
        response.models.push(model.name);
    }

    res.send(response);
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
    const request = req.body as iface.ChatRequest;

    console.log(
`/chat:
    - ip: ${req.ip}
    - user: ${request.username},
    - model: ${request.modelName}
    - messages:
`
);

    for (const message of request.messages) {
        console.log(JSON.stringify({
            'role': message.role,
            'content': message.content
        }));
    }

    // Stream response from model
    const response = await ollama.chat({
        model: MODEL,
        messages: request.messages,
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

    res.end();
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});