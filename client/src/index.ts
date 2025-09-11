import repl, { type REPLWriter } from 'node:repl';
import type { Context } from 'node:vm';

import { ChatSession } from './chatSession.js';

const SERVER: string = "http://oak.lan:8000";

const chat = new ChatSession(SERVER);
await chat.login();

/**
 * TODO:
 * - better greeter page (print the actual commands)
 * - move server to ts and have a shared 'protocols' folder for interfaces
 * - implement more commands!
 * - client-side config/session storage
 * - https://www.npmjs.com/package/boxen for pretty boxes!
 */
const program: repl.REPLServer = repl.start({
    useColors: true,
    terminal: true,
    prompt: chat.userPrompt(),
    input: process.stdin,
    output: process.stdout,
    async eval(input: string, context: Context, file: string, cb: (err: Error | null, result?: any) => void) {
        try {
            const responseStream = await chat.prompt(input);
            const decoder = new TextDecoder();
            
            // Start with model prompt (e.g. "(gpt4.0) > ")
            this.output.write(chat.modelPrompt());

            // Stream output to process.stdout
            while (true) {
                const { value, done } = await responseStream.read();
                if (done) break;
                this.output.write(decoder.decode(value, { stream: true }));
            }

            // Finish with a newline and redraw the user prompt
            this.output.write('\n');
            this.displayPrompt();
        } catch (e) {
            if (e instanceof Error) {
                cb(e);
            } else {
                cb(new Error(String(e)));
            }
        }
    },
});

program.defineCommand('models', {
    help: `view and edit models`,
    async action(input: string) {
        await chat.listModels(input);
        this.displayPrompt();
    },
});

program.on('exit', () => {
    console.log('Goodbye!');
    process.exit();
});