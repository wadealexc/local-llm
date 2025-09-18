import {useCallback, useEffect, useRef, useState} from 'react';

import { type ServerStatus } from './common.js';
import { ChatSession } from './chatSession.js';
import { useEmitter } from './useEmitter.js';

export function useChatSession(chat: ChatSession): {
    status: ServerStatus,
    shutdown: () => void,
} {
    // Server status
    const [status, setStatus] = useState<ServerStatus>(chat.serverStatus);
    useEmitter(chat, 'server:status', (s: ServerStatus) => setStatus(s));

    // Model info TODO

    // Shutdown callback
    const shutdown = useCallback(() => {
        process.stderr.write('shutdown called\n');
        chat.stopSession();
    }, [chat]);

    return {
        status,
        shutdown,
    };
}