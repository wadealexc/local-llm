import { EventEmitter } from 'events';
import * as readline from 'node:readline/promises';
import { stdin as input } from 'node:process';

import { type Message } from 'ollama';
import chalk from 'chalk';

import * as iface from '@local-llm/protocol';

import { type Role, type ServerStatus } from './common.js';


export class ChatSession extends EventEmitter {
    
    // Session/Stream control
    private sessionActive: boolean = false;
    private streamCtrl: AbortController | null = null;

    public server: string;
    public serverStatus: ServerStatus = 'not loaded';
    private pingInterval: NodeJS.Timeout | undefined;

    public username: string;

    // public currentModel: string = '';
    // public systemPrompt: string = '';

    // private messages: Message[] = [];

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

        clearInterval(this.pingInterval);
        this.stopStream();

        this.emit('shutdown');
    }

    // Close out current stream, if one is active
    // Used to abort a chat stream without shutting down the app
    stopStream() {
        if (this.streamCtrl) {
            this.streamCtrl.abort();
            // this.emit('') emit here?
        }
    }

    // Connect to server and fetch models
    async startSession() {
        // Don't start a session if we have an active one
        if (this.sessionActive) throw new Error('tried to start two concurrent sessions!');
        this.sessionActive = true;

        // ping server every second
        this.pingInterval = setInterval(async () => {
            try {
                const res = await fetch(new URL('/ping', this.server));
                if (res.ok) {
                    this.setStatus('online');
                } else {
                    this.setStatus('errors');
                }
            } catch (err: any) {
                this.setStatus('offline');
            }
        }, 1000);

        try {
            // Get available models from server
            const res: Response = await fetch(new URL('/models', this.server));
            if (!res.ok) throw new Error(`GET ${this.server}/models -> ${res.status} : ${res.statusText}`);


        } catch (err: any) {
            return;
        }
    }

    // Set this.serverStatus, emitting an event if the new value is different
    setStatus(status: ServerStatus) {
        if (status !== this.serverStatus) {
            this.serverStatus = status;
            this.emit('server:status', status);
        }
    }
}