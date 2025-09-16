import express from 'express';
import ollama, { type ModelResponse, type ShowResponse, type Message } from 'ollama';

import * as iface from '@local-llm/protocol';

import { Model } from './model.js';

const HOST: string = 'http://oak.lan';
const PORT: number = 8000;
const app = express();
app.use(express.json());

// Get loaded models
let rawModels: ModelResponse[] = (await ollama.list()).models;
if (rawModels.length === 0) throw new Error('No models loaded.');

let models = new Map<string, Model>();

console.log(`Loaded ${rawModels.length} models:`);
for (const model of rawModels) {
    let info: ShowResponse = await ollama.show({ model: model.model });
    models.set(model.name, new Model(model, info));

    console.log(` - ${model.name} (${info.capabilities})`);
}

app.get('/models', (req, res) => {
    let response: iface.ModelsResponse = { models: [] }

    for (const modelName of models.keys()) {
        response.models.push(modelName);
    }

    res.send(response);
});

app.post('/modelInfo', async (req, res) => {
    const modelName = (req.body as iface.ModelInfoRequest).modelName;
    if (!models.has(modelName)) {
        return res.status(400).send(`model ${modelName} not found`);
    }

    const info = await ollama.show({ model: modelName });

    let response: iface.ModelInfoResponse = {
        parameterSize: info.details.parameter_size,
        quantizationLevel: info.details.quantization_level,
        capabilities: info.capabilities,
    };

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
    res.setHeader('Content-Type', 'application/x-ndjson');

    const request = req.body as iface.ChatRequest;

    console.log(`/chat:
    - ip: ${req.ip}
    - data: ${JSON.stringify(request, null, 2)}`);

    const model: Model = models.get(request.modelName) ?? (() => {
        throw new Error(`model ${request.modelName} not found`);
    })();

    // Stream response from model
    const response = await ollama.chat({
        model: model.name,
        messages: request.messages,
        stream: true,
    });

    let totalDuration: number = 0;
    let finalResponse: string = '';
    for await (const part of response) {
        totalDuration = part.total_duration;
        
        finalResponse += part.message.content;
        process.stdout.write(part.message.content);

        // Stream 'delta' response to client
        const delta: iface.ChatDelta = { type: 'delta', content: part.message.content };
        res.write(JSON.stringify(delta) + '\n');
    }

    // Output total duration in seconds
    const seconds: number = Number(totalDuration) / 1e9;
    console.log(`\n... done (took ${seconds.toFixed(3)} s)`);

    // Send 'done' response to client
    const chatDone: iface.ChatDone = {
        type: 'done',
        fullResponse: finalResponse,
        totalDuration: totalDuration,
    };
    res.write(JSON.stringify(chatDone) + '\n');
    res.end();
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});