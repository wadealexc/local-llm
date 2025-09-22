import express from 'express';
import ollama from 'ollama';
import type { ModelResponse, ShowResponse, AbortableAsyncIterator, ChatResponse } from 'ollama';

import * as iface from '@local-llm/protocol';

import { Model, MockModel } from './model.js';

const HOST: string = 'http://oak.lan';
const PORT: number = 8000;
const app = express();
app.use(express.json());

// Get loaded models
const rawModels: ModelResponse[] = (await ollama.list()).models;
if (rawModels.length === 0) throw new Error('No models loaded.');

const models = new Map<string, Model>();
for (const model of rawModels) {
    let info: ShowResponse = await ollama.show({ model: model.model });
    models.set(model.name, new Model(model, info));
}

// Create mock model for testing
models.set(iface.FakeModel, new MockModel(iface.FakeModel));

console.log(`Loaded models:`);
models.entries().forEach(([modelName, model]) => {
    console.log(` - ${modelName} (${model.capabilities})`);
});

app.get('/ping', (req, res) => {
    // const modelName = (req.body as iface.ModelInfoRequest).modelName;

    // console.log('got ping');
    res.send('pong');
});

app.get('/models', (req, res) => {
    let response: iface.ModelsResponse = { models: [] }

    for (const modelName of models.keys()) {
        response.models.push(modelName);
    }

    res.send(response);
});

app.post('/modelInfo', async (req, res) => {
    const modelName = (req.body as iface.ModelInfoRequest).modelName;
    const model = models.get(modelName);
    if (!model) {
        return res.status(400).send(`model ${modelName} not found`);
    }

    let response: iface.ModelInfoResponse = {
        parameterSize: model.parameterSize,
        quantizationLevel: model.quantizationLevel,
        capabilities: model.capabilities,
    };

    res.send(response);
});

app.post('/chat', async (req, res) => {
    res.setHeader('Content-Type', 'application/x-ndjson');

    const request = req.body as iface.ChatRequest;

    console.log(`/chat from ${req.ip}: ${JSON.stringify(request, null, 2)}`);

    const model: Model = models.get(request.modelName) ?? (() => {
        throw new Error(`model ${request.modelName} not found`);
    })();

    let iterator: AbortableAsyncIterator<ChatResponse> | null = null;
    const abortModel = () => { try { iterator?.abort(); } catch { } }

    req.on('close', abortModel);
    res.on('close', abortModel);

    let totalDuration: number = 0;
    let finalResponse: string = '';

    try {
        // Stream response from model
        iterator = await model.chatStream(request.messages);

        for await (const part of iterator) {
            totalDuration = part.total_duration;
            finalResponse += part.message.content;

            if (res.writableEnded) break;

            // Stream 'delta' response to client
            const delta: iface.ChatDelta = { type: 'delta', content: part.message.content };
            process.stdout.write(part.message.content);
            res.write(JSON.stringify(delta) + '\n');
        }

        // Output total duration in seconds
        const seconds: number = Number(totalDuration) / 1e9;
        console.log(`\n... done (took ${seconds.toFixed(3)} s)`);

        // If the stream is still open, send 'done' response to client
        if (!res.writableEnded) {
            const chatDone: iface.ChatDone = {
                type: 'done',
                fullResponse: finalResponse,
                totalDuration: totalDuration,
            };
            res.write(JSON.stringify(chatDone) + '\n');
            res.end();
        }
    } catch (err: any) {
        // If the client aborted, the loop/read will error: swallow quietly.
        const msg = String(err?.message ?? err);
        console.log(`\nerr: ${msg}`);

        const aborted = msg.toLowerCase().includes('aborted') || msg.includes('ERR_STREAM_PREMATURE_CLOSE');
        if (!aborted && !res.writableEnded) {
            res.write(JSON.stringify({ type: 'error', message: msg }) + '\n');
        }
    } finally {
        req.off('close', abortModel);
        res.off('close', abortModel);
        if (!res.writableEnded) res.end();
    }
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});