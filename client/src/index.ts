import readline from 'node:readline';

import { Command, type CommanderError } from 'commander';
import chalk from 'chalk';
import { parseArgsStringToArgv } from 'string-argv';

import { ChatSession } from './chatSession.js';

const SERVER: string = "http://oak.lan:8000";

const chat = new ChatSession(SERVER, process.stdout);
await chat.load();

const program = new Command()
    .name('')
    .description('')
    .usage('')
    .helpOption(false)
    .exitOverride()
    // .configureOutput({
    //     writeOut: (s) => process.stdout.write(s),
    //     writeErr: (s) => process.stdout.write(s),
    //     outputError: (s, write) => write(s),
    // })
    .showHelpAfterError();

program.configureHelp({
    styleTitle: (title) => '',
    commandUsage: (cmd) => '',
    subcommandTerm: (cmd) => {
        if (cmd.args.length === 0) {
            return chalk.yellow(`.${cmd.name()}`);
        } else {
            return `${chalk.yellow(`.${cmd.name()}`)} `;
        }
        
    }
});

const models = program.command('model')
    .alias('models')
    .description('view and configure models')
    .action(async () => {
        await chat.listModels();
    });

models.configureHelp({
    styleTitle: () => '',
    styleCommandDescription: () => '',
    commandUsage: (cmd) => '',
    subcommandTerm: (cmd) => chalk.yellow(`.${models.name()} ${cmd.name()}`)
});

models.command('list')
    .description('list available models')
    .action(async () => {
        await chat.listModels();
    });

models.command('use')
    .description('switch to a different model')
    .argument('<name>', 'model name')
    .action(async (name: string) => {
        await chat.useModel(name);
    });

models.command('info')
    .description(`get info on a model's capabilities`)
    .argument('<name>', 'model name')
    .action(async (name: string) => {
        await chat.getModelInfo(name);
    });

const help = program.command('help')
    .description('print the help screen, or print help for a specific command')
    .usage(`use standalone to get basic help, or with another command to learn more about a command:
 ${chalk.yellow('.help')} -- print basic help for all commands
 ${chalk.yellow('.help models')} -- print detailed help for the 'models' command`)
    .argument('[command]', 'the command to get help with')
    .action(async (cmdName: string | undefined) => {
        process.stdout.write(chat.sessionPrompt());
        if (!cmdName) {
            process.stdout.write(`available commands:\n`);
            process.stdout.write(program.helpInformation());
        } else {
            const cmd = program.commands.find(cmd => cmd.name() === cmdName);
            if (!cmd) {
                process.stdout.write(`command ${cmdName} not found. available commands:\n`);
                process.stdout.write(program.helpInformation());
            } else {
                process.stdout.write(`help for ${chalk.yellow.italic(`.${cmd.name()}`)}:\n`);
                cmd.outputHelp();
            }
        }
    });

// Currently accessibly mostly if called via .help help
// ... probably want this to be more visible
help.configureHelp({
    styleTitle: (title) => {
        if (title === 'Usage:') {
            return title;
        } else {
            return '';
        }
    },
    commandUsage: (cmd) => cmd.usage(),
});

// --- interactive loop using readline ---
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chat.userPrompt(),
});

function refreshPrompt() {
    rl.setPrompt(chat.userPrompt());
    rl.prompt();
}

refreshPrompt();

rl.on('line', async (rawLine) => {
    const line = rawLine.trim();
    if (!line) return refreshPrompt();

    try {
        // If line starts with '.', interpret as a command
        // Otherwise, treat as a chat message to the llm
        if (line.startsWith('.')) {
            const argv = parseArgsStringToArgv(line.slice(1));
            await program.parseAsync(argv, { from: 'user' });
        } else {
            await chat.prompt(line);
        }
    } catch (err: any) {
        // Commander throws on .exitOverride(); print friendly message
        if (err?.code === 'commander.helpDisplayed') {
            // already printed
        } else if (err?.code === 'commander.unknownCommand') {
            process.stdout.write(chalk.red(`Unknown command: ${line}\n`));
        } else if (err instanceof Error) {
            process.stdout.write(chalk.red(`${err.message}\n`));
        } else {
            process.stdout.write(chalk.red(`${String(err)}\n`));
        }
    } finally {
        refreshPrompt();
    }
});

// Handle Ctrl+C / Ctrl+D
rl.on('SIGINT', () => {
    // emulate REPL behavior: first ^C clears line; second exits
    if ((rl as any)._line && (rl as any)._line.length > 0) {
        readline.clearLine(process.stdout, 0);
        rl.write(null, { ctrl: true, name: 'u' } as any); // clear input
        refreshPrompt();
    } else {
        process.stdout.write('\n');
        rl.close();
    }
});

rl.on('close', () => {
    process.stdout.write(`\n${chat.sessionPrompt()}Goodbye!\n`);
    process.exit(0);
});