import { EventEmitter } from 'events';

export type LogLevel = 'debug' | 'info' | 'error';
export type LogEntry = {
    scope: string;
    level: LogLevel;
    text: string;
    msElapsed: number;
}

export interface ILogger {
    error(msg: string): void;
    info(msg: string): void;
    debug(msg: string): void;
}

class Logger extends EventEmitter {

    private readonly startedAtMs = Date.now();
    private logs: LogEntry[] = [];
    private snapshot: readonly LogEntry[] = this.logs;
    private maxEntries = 100;

    add(level: LogLevel, msg: string, scope: string) {
        const msElapsed = (Date.now() - this.startedAtMs);
        
        this.logs.push({
            scope: scope,
            level: level,
            text: msg,
            msElapsed: msElapsed
        });

        // Keep only the most recent maxEntries
        if (this.logs.length > this.maxEntries) {
            this.logs.splice(0, this.logs.length - this.maxEntries);
        }

        // Copy the contents of this.logs to snapshot
        // This ensures that `getLogs()` returns a new object after the update,
        // which `useSyncExternalStore` uses to detect that an update occurred.
        this.snapshot = [...this.logs];
        this.emit('update');
    }

    getLogs(): readonly LogEntry[] {
        return this.snapshot;
    }

    scoped(name: string): ILogger {
        return {
            error: ((msg: string) => this.add('error', msg, name)),
            info: ((msg: string) => this.add('info', msg, name)),
            debug: ((msg: string) => this.add('debug', msg, name)),
        }
    }
}

export const globalLogger = new Logger();

export const logger = ((name: string): ILogger => {
    return globalLogger.scoped(name);
});