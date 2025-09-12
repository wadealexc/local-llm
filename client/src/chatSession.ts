import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { type Message } from 'ollama';

import chalk from 'chalk';

import * as iface from '@local-llm/protocol';

enum Role {
    User = "user",
    LLM = "assistant",
    System = "system",
}

export class ChatSession {

    private loaded: boolean = false;

    public server: string;
    public username: string = 'guest';

    public currentModel: string = '';
    public systemPrompt: string = '';

    private messages: Message[] = [];

    constructor(server: string) {
        this.server = server;
    }

    /**
     * POST:
     */

    async load() {
        if (this.loaded) throw new Error(`Already loaded!`);

        // Prompt user for display name
        const rl = readline.createInterface({ input, output });
        let username: string = (await rl.question('enter name (or leave blank for guest): '))
            .trim()
            .toLowerCase() || 'guest';

        rl.close();

        // Get available models from server
        const res: Response = await fetch(new URL('/models', this.server));
        if (!res.ok) throw new Error(`GET ${this.server}/models -> ${res.status} : ${res.statusText}`);

        let modelInfo = (await res.json()) as iface.ModelsResponse;
        if (modelInfo.models.length === 0) {
            throw new Error('No models available');
        }

        // Display info on available models and select the user's default model
        console.log(`Server is online. ${modelInfo.models.length} models available.`);
        for (const model of modelInfo.models) {
            console.log(` - ${model}`);
        }
        console.log('');

        // TODO; switch to load from config (default model + system prompt)
        // - also TODO - load chat history here
        let preferredDefaultModel: string = 'qwen3:4b'
        this.currentModel = 
            modelInfo.models.find(model => model === preferredDefaultModel)
            ?? modelInfo.models[0]
            ?? (() => { throw new Error('(unreachable) No models available.'); })();

        // Create system prompt    
        let dateString = (new Date())
            .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        this.systemPrompt = 
`You are a self-hosted language model running on ${this.server}.
Current date: ${dateString}

Personality:
You are a capable, thoughtful, and precise assistant. Your goal is to understand the user's intent, ask clarifying questions when needed, think step-by-step through problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences.`;

        // Insert system prompt into message history
        this.messages.push({
            role: Role.System,
            content: this.systemPrompt
        });

        // Greet user
        console.log(
`hello, ${this.username}!
🌳 welcome to ${chalk.magenta.bold('treehouse.repl')} 🌳
type anything to chat with the default model (${chalk.cyan.bold(this.currentModel)})
... or type ${chalk.yellow.italic('.help')} to see available commands!`
        );

        this.loaded = true;
    }

    async prompt(input: string): Promise<ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>> {
        if (!this.loaded) throw new Error('Not loaded!');

        // Push input to chat history
        this.messages.push({ role: Role.User, content: input });

        // Send chat to server
        // TODO - fetch accepts an "AbortController" signal; can use this to kill a response we don't want
        const req: iface.ChatRequest = {
            username: this.username,
            modelName: this.currentModel,
            messages: this.messages
        };
        const res: Response = await fetch(new URL('/chat', this.server), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        });

        if (!res.ok) throw new Error(`POST ${this.server}/chat -> ${res.status}: ${res.statusText}`);
        if (!res.body) throw new Error(`POST ${this.server}/chat -> Got ${res.status} but no response body!`);

        // Get ready to stream response
        return res.body.getReader();
    }

    /**
     * GET:
     */

    async listModels(input: string) {
        if (!this.loaded) throw new Error('Not loaded!');

        const res: Response = await fetch(new URL('/models', this.server));
        if (!res.ok) throw new Error(`GET ${this.server}/models -> ${res.status} : ${res.statusText}`);

        let modelInfo = (await res.json()) as iface.ModelsResponse;

        console.log(`${modelInfo.models.length} models available:`)
        for (const model of modelInfo.models) {
            console.log(` - ${model}`);
        }

        console.log(`\nYou are using: ${chalk.cyan.bold(this.currentModel)}`);
    }

    /**
     * Util:
     */

    /**
     * @returns the string displayed for the user prompt (e.g. "(fox) > ")
     */
    userPrompt(): string {
        if (this.loaded) {
            return chalk.green.bold(`(${this.username}) > `);
        } else {
            return chalk.green.bold(`(you) > `);
        }
    }

    /**
     * @returns the string displayed for the current llm (e.g. "(gpt4.0) > ")
     */
    modelPrompt(): string {
        if (!this.loaded) throw new Error('Not loaded!');

        return chalk.cyan.bold(`(${this.currentModel}) > `);
    }
}