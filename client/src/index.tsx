import * as readline from 'node:readline/promises';

import { Command, type CommanderError } from 'commander';
import chalk from 'chalk';
import { parseArgsStringToArgv } from 'string-argv';
import { render } from 'ink';

import App from './app.js';
import { ChatSession } from './chatSession.js';

const SERVER: string = "http://oak.lan:8000";

// TODO: for some reason, this hijacks stdin even after we call `rl.close()`
// // Prompt user for display name
// const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// let username: string = (await rl.question('Enter name (or leave blank for guest): '))
//     .trim()
//     .toLowerCase() || 'guest';

// rl.close();

let username = 'fox';

const chat = new ChatSession(SERVER, username);
chat.startSession();

render(<App chat={chat} />);