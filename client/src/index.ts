import repl, { type REPLWriter } from 'node:repl';
import type { Context } from 'node:vm';

import { ChatSession } from './chatSession.js';

const SERVER: string = "http://oak.lan:8000";

const chat = new ChatSession(SERVER);
await chat.load();

const program: repl.REPLServer = repl.start({
    useColors: true,
    terminal: true,
    prompt: chat.userPrompt(),
    input: process.stdin,
    output: process.stdout,
    async eval(input: string, context: Context, file: string, cb: (err: Error | null, result?: any) => void) {
        try {
            await chat.prompt(this.output, input);
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