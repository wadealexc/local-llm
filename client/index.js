import repl from 'node:repl';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SERVER = "http://oak.lan";
const PORT = 8000;

const rl = readline.createInterface({ input, output });
const USERNAME = (await rl.question('Enter name (or leave blank for guest): '))
    .trim()
    .toLowerCase() || 'guest';

rl.close();

const program = repl.start({
    useColors: true,
    terminal: true,
    prompt: `(${USERNAME}) > `
});

program.defineCommand('models');

program.on('exit', () => {
    console.log('Goodbye!');
    process.exit();
});

