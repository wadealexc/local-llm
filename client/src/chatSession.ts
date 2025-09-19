import { EventEmitter } from 'events';
import { type Message } from 'ollama';

import * as iface from '@local-llm/protocol';

import { Role, type ServerStatus, type ModelInfo, type ChatMsg } from './common.js';


export class ChatSession extends EventEmitter {

    // Session/Stream control
    private sessionActive: boolean = false;
    private streamCtrl: AbortController | null = null;
    private pingCtrl: AbortController | null = null;

    // Streams/Connections
    private pingTimer: NodeJS.Timeout | undefined;

    // Session info
    public username: string;

    public server: string;
    public serverStatus: ServerStatus = 'not loaded';
    public currentModel: ModelInfo | null = null;

    private systemPrompt: string = '';
    public messages: ChatMsg[] = [];

    constructor(server: string, username: string) {
        super();

        this.server = server;
        this.username = username;
    }

    // Shutdown any ongoing connections with the server and close out any streams.
    // Used when stopping the app. No-op if we don't have an active session
    stopSession() {
        process.stderr.write('stopSession called\n');

        if (this.sessionActive === false) return;
        this.sessionActive = false;

        if (this.pingTimer) {
            clearTimeout(this.pingTimer);
            this.pingTimer = undefined;
        }

        this.stopStream();
        this.emit('shutdown');
    }

    startStream(): AbortSignal {
        // Call stopStream first!
        if (this.streamCtrl) throw new Error('tried to start a stream before previous stream shut down!');

        // Create a new signal and tell listeners the stream has started
        this.streamCtrl = new AbortController();
        this.emit('stream:start');

        return this.streamCtrl.signal;
    }

    // Close out current stream, if one is active
    // Used to abort a chat stream without shutting down the app
    stopStream(duration?: string) {
        // Already stopped! We're done here.
        if (!this.streamCtrl) return;

        this.streamCtrl.abort();
        this.streamCtrl = null;
        this.emit('stream:end');
    }

    // Connect to server and fetch models
    async startSession() {
        // Don't start a session if we have an active one
        if (this.sessionActive) throw new Error('tried to start two concurrent sessions!');
        this.sessionActive = true;

        // ping once immediately
        await this.pingServer();

        // ping server once per second
        const loop = async () => {
            if (!this.sessionActive) return;
            await this.pingServer();
            if (!this.sessionActive) return;

            this.pingTimer = setTimeout(loop, 1000);
            this.pingTimer.unref(); // don't hold event loop hostage if process is exiting
        };
        this.pingTimer = setTimeout(loop, 1000);
        this.pingTimer.unref();

        // Fetch available models from server
        let models: string[] = [];
        try {
            const res: Response = await fetch(new URL('/models', this.server));
            if (!res.ok) throw new Error(`GET ${this.server}/models -> ${res.status} : ${res.statusText}`);

            const modelsRes = (await res.json()) as iface.ModelsResponse;
            if (modelsRes.models.length === 0) throw new Error(`Server did not return any models`);

            models = modelsRes.models;
        } catch (err: any) {
            throw new Error(`Error fetching models from server: ${err}`);
        }

        // TODO; switch to load from config (default model + system prompt)
        // - also TODO - load chat history here
        const preferredDefaultModel: string = iface.FakeModel;
        const defaultModel = models.find(m => m === preferredDefaultModel)
            ?? models[0]
            ?? (() => { throw new Error('(unreachable) No models available') })();

        try {
            const req: iface.ModelInfoRequest = { modelName: defaultModel };
            const res: Response = await fetch(new URL('/modelInfo', this.server), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req),
            });
            if (!res.ok) throw new Error(`POST ${this.server}/modelInfo -> ${res.status} : ${res.statusText}`);

            const modelInfo = (await res.json()) as iface.ModelInfoResponse;
            this.setModelInfo({
                modelName: defaultModel,
                params: modelInfo.parameterSize,
                quantization: modelInfo.quantizationLevel,
            });
        } catch (err: any) {
            throw new Error(`Error decoding response from /models: ${err}`);
        }

        // Create system prompt    
        const dateString = (new Date())
            .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        this.systemPrompt =
            `You are ${defaultModel}, a self-hosted language model running on ${this.server}.
Current date: ${dateString}

Personality:
You are a capable, thoughtful, and precise assistant. Your goal is to understand the user's intent, ask clarifying questions when needed, think step-by-step through problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences.`;

        this.#pushMessage({
            role: Role.System,
            content: this.systemPrompt
        });
    }

    async pingServer() {
        try {
            // Cancel previous fetch if somehow still active
            this.pingCtrl?.abort();
            this.pingCtrl = new AbortController();

            const res = await fetch(new URL('/ping', this.server), {
                signal: this.pingCtrl.signal,
            });

            // Discard body
            res.body?.cancel?.();
            this.setStatus(res.ok ? 'online' : 'errors');
        } catch (err: any) {
            this.setStatus('offline');
        } finally {
            if (this.pingCtrl?.signal?.aborted) return;
            this.pingCtrl = null;
        }
    }

    // Set this.serverStatus, emitting an event if the new value is different
    setStatus(status: ServerStatus) {
        if (status !== this.serverStatus) {
            this.serverStatus = status;
            this.emit('server:status', status);
        }
    }

    // Set this.currentModel, emitting an event if the new value is different
    setModelInfo(info: ModelInfo) {
        if (!this.currentModel || this.currentModel.modelName !== info.modelName) {
            this.currentModel = info;
            this.emit('model:set', info);
        }
    }

    #pushMessage(m: Message) {
        this.messages.push({
            id: `${this.messages.length}`,
            role: m.role as Role,
            content: m.content
        });
        this.emit('message:set', this.messages);
    }

    // Possible bad entry states:
    // - empty input (may need third party library for validation?)
    // - llm stream still ongoing, not cancelled via standard abort
    // - "double bubble", user manages to submit a message twice
    async prompt(input: string, trim?: number) {
        const modelName: string = this.currentModel?.modelName
            ?? (() => { throw new Error(`chatSession.prompt called before model available`) })();

        // If the user is editing a prior message, update message history
        if (trim && this.messages.length > trim) {
            this.messages.length -= trim;
            this.emit('message:set', this.messages);
        }

        const initialLength: number = this.messages.length;

        // Push message to chat history
        // TODO - this is sync, which may mean we are blocking while history re-renders?
        this.#pushMessage({ role: Role.User, content: input });

        // Cancel previous stream if active, then start a new stream
        this.stopStream();
        const signal: AbortSignal = this.startStream();
        let reader: ReadableStreamDefaultReader | null = null;

        try {
            const req: iface.ChatRequest = {
                username: this.username,
                modelName: modelName,
                messages: this.messages
            };

            const res: Response = await fetch(new URL('/chat', this.server), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req),
                signal: signal,
            });

            if (!res.ok) throw new Error(`POST ${this.server}/chat -> ${res.status}: ${res.statusText}`);
            if (!res.body) throw new Error(`POST ${this.server}/chat -> Got ${res.status} but no response body!`);

            // Get ready to stream response
            reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            let final: iface.ChatDone | null = null;
            
            // Read from stream, parsing response as newline-delimited chunks
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buf += decoder.decode(value, { stream: true });

                while (true) {
                    // Only process complete lines of ND-JSON
                    const nl = buf.indexOf('\n');
                    if (nl === -1) break;

                    const line = buf.slice(0, nl);
                    buf = buf.slice(nl + 1);
                    if (!line.trim()) continue;

                    const evt = JSON.parse(line) as iface.ChatEvent;

                    switch (evt.type) {
                        case 'delta':
                            // this is synchronous, but i think we want that here.
                            this.emit('stream:push', evt.content);
                            break;
                        case 'done':
                            final = evt as iface.ChatDone;
                            break;
                        case 'error':
                            throw new Error(evt.message);
                    }
                }
            }

            if (!final) throw new Error('stream ended without final payload');

            // End stream and emit time taken. Then push LLM message to chat history
            const seconds: number = Number(final.totalDuration) / 1e9;
            this.stopStream(seconds.toFixed(3));
            this.#pushMessage({ role: Role.LLM, content: final.fullResponse });
        } catch (err: any) {
            // Reset chat history
            if (initialLength !== this.messages.length) {
                this.messages.length = initialLength;
                this.emit('message:set', this.messages);
            }

            if (err?.name === 'AbortError' || String(err?.message).toLowerCase().includes('aborted')) {
                // this.output.write(chalk.dim.italic('\n(^C) canceled\n')); TODO log/display?
                return;
            } else {
                throw err;
            }
        } finally {
            reader?.releaseLock();
            this.stopStream();
        }
    }
}