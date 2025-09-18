import { useCallback, useEffect, useRef, useState } from 'react';

import { type ServerStatus, type ModelInfo, type ChatMsg } from './common.js';
import { ChatSession } from './chatSession.js';
import { useEmitter } from './useEmitter.js';

export function useChatSession(chat: ChatSession): {
    status: ServerStatus,
    modelInfo: ModelInfo | null,
    history: ChatMsg[],
    shutdown: () => void,
} {
    // Server status
    const [status, setStatus] = useState<ServerStatus>(chat.serverStatus);
    useEmitter(chat, 'server:status', (s: ServerStatus) => setStatus(s));

    // Model info
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    useEmitter(chat, 'model:set', (m: ModelInfo) => setModelInfo(m));

    // Chat history
    const [history, setHistory] = useState<ChatMsg[]>([]);
    useEmitter(chat, 'message:push', (m: ChatMsg) => setHistory(h => [...h, m]));

    // Shutdown callback
    const shutdown = useCallback(() => {
        process.stderr.write('shutdown called\n');
        chat.stopSession();
    }, [chat]);

    return {
        status,
        modelInfo,
        history,
        shutdown,
    };
}