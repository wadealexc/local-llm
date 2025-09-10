import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { StringifyOptions } from 'node:querystring';

import chalk from 'chalk';

import * as interfaces from './interfaces.js';

export class ChatSession {

    private loggedIn: boolean = false;

    public server: string;
    public username: string = 'guest';
    public currentModel: string = '';

    constructor(server: string) {
        this.server = server;
    }

    /**
     * POST:
     */

    async login() {
        if (this.loggedIn) throw new Error(`Already logged in!`);

        // Prompt user for username
        const rl = readline.createInterface({ input, output });
        let username: string = (await rl.question('enter name (or leave blank for guest): '))
            .trim()
            .toLowerCase() || 'guest';

        rl.close();

        // Log in to server
        const req: interfaces.LoginRequest = { username: username }
        const res: Response = await fetch(new URL('/login', this.server), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
        });

        if (!res.ok) throw new Error(`POST ${this.server}/login -> ${res.status}: ${res.statusText}`);

        const sessionInfo = (await res.json()) as interfaces.LoginResponse;
        this.loggedIn = true;
        this.username = sessionInfo.username;
        this.currentModel = sessionInfo.modelName;

        console.log(
`hello, ${this.username}!
🌳 welcome to ${chalk.magenta.bold('treehouse.repl')} 🌳
type anything to chat with the default model (${chalk.cyan.bold(this.currentModel)})
... or type ${chalk.yellow.italic('.help')} to see available commands!`
        );
    }

    async prompt(input: string): Promise<ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>> {
        if (!this.loggedIn) throw new Error('Not logged in!');

        // TODO - fetch accepts an "AbortController" signal; can use this to kill a response we don't want
        const req: interfaces.ChatRequest = {
            username: this.username,
            message: input
        };
        const res: Response = await fetch(new URL('/chat', this.server), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        });

        if (!res.ok) throw new Error(`POST ${this.server}/chat -> ${res.status}: ${res.statusText}`);
        if (!res.body) throw new Error(`POST ${this.server}/chat -> Got ${res.status} but no response body!`);

        return res.body.getReader();
    }

    /**
     * GET:
     */

    async listModels(input: string) {
        if (!this.loggedIn) throw new Error('Not logged in!');

        const res: Response = await fetch(new URL('/models', this.server));
        if (!res.ok) throw new Error(`GET ${this.server}/models -> ${res.status} : ${res.statusText}`);

        let modelInfo = (await res.json()) as interfaces.ModelsResponse;

        console.log(`${modelInfo.models.length} models available:`)
        for (const model of modelInfo.models) {
            console.log(` - ${model}`);
        }

        console.log(`\nYou are using: ${this.currentModel}`);
    }

    /**
     * Util:
     */

    /**
     * @returns the string displayed for the user prompt (e.g. "(fox) > ")
     */
    userPrompt(): string {
        if (this.loggedIn) {
            return chalk.green.bold(`(${this.username}) > `);
        } else {
            return chalk.green.bold(`(you) > `);
        }
    }

    /**
     * @returns the string displayed for the current llm (e.g. "(gpt4.0) > ")
     */
    modelPrompt(): string {
        if (!this.loggedIn) throw new Error('Not logged in!');

        return chalk.cyan.bold(`(${this.currentModel}) > `);
    }
}