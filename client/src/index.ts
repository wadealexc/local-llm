import repl, { type REPLWriter } from 'node:repl';
import type { Context } from 'node:vm';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import chalk from 'chalk';

const SERVER: string = "http://oak.lan:8000";

const rl = readline.createInterface({ input, output });
let USERNAME: string = (await rl.question('Enter name (or leave blank for guest): '))
    .trim()
    .toLowerCase() || 'guest';

rl.close();

let sessionInfo = await login(USERNAME);
if (sessionInfo.username !== USERNAME) {
    USERNAME = sessionInfo.username;
}

const program: repl.REPLServer = repl.start({
    useColors: true,
    terminal: true,
    prompt: chalk.green.bold(`(${USERNAME}) > `),
    eval: replEval,
    writer: replWriter
});

// program.defineCommand('models');

program.on('exit', () => {
    console.log('Goodbye!');
    process.exit();
});

// https://nodejs.org/api/repl.html#custom-evaluation-functions
async function replEval(
    input: string, 
    ctx: Context, 
    resourceName: string, 
    cb: (err: Error | null, result?: any) => void
) {
    // console.log('hi');
    try {
        const response = await get();
        cb(null, response);
    } catch (e) {
        if (e instanceof Error) {
            cb(e);
        } else {
            cb(new Error(String(e)));
        }
    }
}

// https://nodejs.org/api/repl.html#customizing-repl-output
function replWriter(output: any): string {
    if (typeof output === 'string') {
        return output;
    } else {
        console.log('Converting output to string!'); // im just not sure when we'd do this, so let's log if we do
        return `${output}`;
    }
}

// /login { username: fox }
async function login(username: string) {
    const res = await fetch(new URL('/login', SERVER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'username': username
        })
    });

    if (!res.ok) throw new Error(`POST ${SERVER}/login -> ${res.status} : ${res.statusText}`);

    // validate response (oh god i think i need typescript)
    const resultJSON = await res.json();
    if (typeof resultJSON.username !== 'string') {
        throw new Error('fuck you');
    }

    if (typeof resultJSON.modelName !== 'string') {
        throw new Error('double fuck you');
    }

    return resultJSON;
}

async function get() {
    const res = await fetch(new URL('/', SERVER));
    if (!res.ok) throw new Error(`GET ${SERVER}/ -> ${res.status} : ${res.statusText}`);
    return res.text();
}

// async function chat(input) {
//     const res = await fetch(new URL('/chat', SERVER), {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//             'username': USERNAME,
//             'msg': input
//         })
//     });

// }