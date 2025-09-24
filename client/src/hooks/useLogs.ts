import { useSyncExternalStore, useMemo, useEffect } from "react";

import { globalLogger, logger, type ILogger, type LogEntry } from "../utils/logger.js";

// Returns a subscription to the global logger
export function useLogs(): readonly LogEntry[] {
    return useSyncExternalStore(
        (onStoreChange) => {
            globalLogger.on('update', onStoreChange);
            return () => globalLogger.off('update', onStoreChange);
        },
        () => globalLogger.getLogs()
    );
}

// Used by a component to return a named logger that logs when the
// component is mounted/unmounted
export function useLogSend(name: string): ILogger {
    const log = useMemo(() => {
        return logger(name);
    }, []);

    useEffect(() => {
        log.debug('mounted');
        return () => {
            log.debug('unmounted');
        };
    }, [log]);

    return log;
}