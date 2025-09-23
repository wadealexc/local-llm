import { EventEmitter } from 'events';
import { type Message } from 'ollama';

import * as iface from '@local-llm/protocol';

import { Role, type ServerStatus, type ModelInfo, type ChatMsg } from './common.js';
import { ChatNode, ChatTree, type ChatRoot } from './utils/chatTree.js';

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

    // Keep track of all chats, as well as the currently-active chat and the working index in that chat
    private chatTree: ChatTree;
    private currentMessage?: ChatNode;

    constructor(server: string, username: string) {
        super();

        this.server = server;
        this.username = username;
        this.chatTree = new ChatTree();
    }

    topics(): string[] {
        return this.chatTree.roots.map((root) => root.topic);
    }

    // Create a new chat and select it
    newTopic(topic: string, modelName: string) {
        const root: ChatNode = this.chatTree.pushTopic(topic, modelName, this.server);
        // this.emit('topic:new'); // TODO

        this.currentMessage = root;
        this.emit('message:set', root.getNodeInfo());
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

        // Push a new topic and system message to the chat tree and select it as the default
        this.newTopic(`topic ${this.topics().length}`, defaultModel);
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

        if (!duration) {
            this.emit('stream:abort');
        } else {
            this.emit('stream:end', duration);
        }
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

    // TODO - this.emit is sync, which may mean we are blocking while history re-renders?
    #pushMessage(m: ChatMsg): ChatMsg[] {
        if (!this.currentMessage) throw new Error('chatSession.pushMessage called before topic created');

        const newMessage = this.currentMessage.newChild(m);
        this.currentMessage = newMessage;

        const info = newMessage.getNodeInfo();
        this.emit('message:set', info);

        return info.history;
    }

    // Possible bad entry states:
    // - empty input (may need third party library for validation?)
    // - llm stream still ongoing, not cancelled via standard abort
    // - "double bubble", user manages to submit a message twice
    async prompt(input: string, trim?: number) {
        const modelName: string = this.currentModel?.modelName
            ?? (() => { throw new Error(`chatSession.prompt called before model available`) })();

        // Push message to chat history, saving our place in case we abort
        const initialSelected = this.currentMessage;
        const messages: ChatMsg[] = this.#pushMessage({ role: Role.User, content: input });

        // Cancel previous stream if active, then start a new stream
        this.stopStream();
        const signal: AbortSignal = this.startStream();
        let reader: ReadableStreamDefaultReader | null = null;

        try {
            const req: iface.ChatRequest = {
                username: this.username,
                modelName: modelName,
                messages: messages
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
            if (initialSelected) {
                this.currentMessage = initialSelected;
                this.emit('message:set', this.currentMessage.getNodeInfo());
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

    // Move this.currentMessage to its parent, if it exists (else no-op)
    // Emit the 'next visible message' if we were to select the child
    selectParent() {
        if (!this.currentMessage?.parent) return;

        const child = this.currentMessage;
        this.currentMessage = this.currentMessage.parent;
        this.emit('message:set', this.currentMessage.getNodeInfo());
    }

    // Move this.currentMessage to its selected child, if it exists (else no-op)
    selectChild() {
        const child = this.currentMessage?.getSelectedChild();
        if (!child) return;

        this.currentMessage = child;
        this.emit('message:set', child.getNodeInfo());
    }

    // Move between chat siblings if they exist (else no-op)
    selectNextThread() {
        const sibling = this.currentMessage?.parent?.selectNextThread();
        if (!sibling) return;

        this.currentMessage = sibling;
        this.emit('message:set', sibling.getNodeInfo());
    }

    selectPrevThread() {
        const sibling = this.currentMessage?.parent?.selectPrevThread();
        if (!sibling) return;

        this.currentMessage = sibling;
        this.emit('message:set', sibling.getNodeInfo());
    }
}