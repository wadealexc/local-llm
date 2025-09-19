import { useCallback, useEffect, useRef, useState } from 'react';

import { type ServerStatus, type ModelInfo, type ChatMsg } from '../common.js';
import { ChatSession } from '../chatSession.js';
import { useEmitter } from './useEmitter.js';

export type HistoryView = {
    hist: ChatMsg[];
    trim: number;
}

export function useChatSession(chat: ChatSession): {
    status: ServerStatus,
    modelInfo: ModelInfo | null,
    history: HistoryView,
    setHistory: React.Dispatch<React.SetStateAction<HistoryView>>,
    shutdown: () => void,
} {
    // Server status
    const [status, setStatus] = useState<ServerStatus>(chat.serverStatus);
    useEmitter(chat, 'server:status', (s: ServerStatus) => setStatus(s));

    // Model info
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    useEmitter(chat, 'model:set', (m: ModelInfo) => setModelInfo(m));

    /**
     * Scrollable chat history
     * 
     * When we push a message to history, reset 'trim' to ensure
     * the new message is rendered. This has the effect of jumping
     * to the new message as it gets added.
     * 
     * (Concept adapted from https://github.com/sasaplus1/inks/blob/main/packages/ink-scroll-box)
     */
    const [history, setHistory] = useState<HistoryView>({
        hist: [],
        trim: 0
    });
    useEmitter(chat, 'message:push', (m: ChatMsg) => setHistory(
        prev => ({
            hist: [...prev.hist, m],
            trim: 0
        })
    ));

    // Shutdown callback
    const shutdown = useCallback(() => {
        process.stderr.write('shutdown called\n');
        chat.stopSession();
    }, [chat]);

    return {
        status,
        modelInfo,
        history,
        setHistory,
        shutdown,
    };
}