import repl, { type REPLCommand, type REPLWriter } from 'node:repl';
import type { Context } from 'node:vm';

import chalk from 'chalk';

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



// Remove unneeded commands
const cmds = (program as any).commands as Record<string, REPLCommand>;
['break', 'clear', 'load', 'save'].forEach(k => {
    delete cmds[k];
});

// // Add commands with aliases
// ['model', 'models'].forEach(k => {
//     program.defineCommand()
// });

// program.defineCommand('editor', {
//     help: 'test',
//     action() {
//         console.log('pingus')
//         this.displayPrompt();
//     }
// });

program.defineCommand('models', {
    help: `view and edit models`,
    async action(input: string) {
        await chat.listModels(input);
        this.displayPrompt();
    },
});

// Re-implement builtin help function to color command names
// (from https://github.com/nodejs/node/blob/v24.8.0/lib/repl.js#L2089)
program.defineCommand('help', {
    help: 'print this help message',
    action: function() {
        const color = chalk.yellow.italic;

        const names: string[] = Object.keys(program.commands).sort();
        const longestNameLength: number = names.reduce((m, n) => Math.max(m, n.length), 0);

        names.forEach((name) => {
            const cmd = this.commands[name];
            const spaces = ' '.repeat(longestNameLength - name.length + 3);
            if (!cmd) {
                this.output.write(`${color(`.${name}`)} undefined\n`);
            } else if (!cmd.help) {
                this.output.write(`${color(`.${name}`)}\n`);
            } else {
                this.output.write(`${color(`.${name}`)}${spaces}${cmd.help}\n`);
            }
        });

        this.output.write(`\nPress Ctrl+C to abort current expression, Ctrl+D to exit the program\n`);
        this.displayPrompt();
    }
});

program.on('exit', () => {
    console.log('Goodbye!');
    process.exit();
});