import { useCallback, useEffect, useRef, useState } from 'react';

import { type ServerStatus, type ModelInfo, type ChatMsg } from '../common.js';
import { ChatSession } from '../chatSession.js';
import { useEmitter } from './useEmitter.js';

export type HistoryView = {
    hist: ChatMsg[];
    trim: number;
}

type Mode = 'ready' | 'stream';

export function useChatSession(chat: ChatSession): {
    status: ServerStatus,
    modelInfo: ModelInfo | null,
    mode: Mode,
    streamOutput: string | null,
    history: HistoryView,
    setHistory: React.Dispatch<React.SetStateAction<HistoryView>>,
    stopStream: () => void,
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
     * 
     * TODO - this is effectively managing 2 copies of history. one in chatSession, one via useState
     * if there are issues with sync, we may want to have `setHistory` just read from chat.history().
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
    useEmitter(chat, 'message:pop', () => setHistory(
        prev => ({
            hist: prev.hist.slice(0, -1),
            trim: 0
        })
    ));

    /**
     * Mode and chat stream output:
     * - mode: ready => user can input
     * - mode: stream => reading stream from llm
     */
    const [mode, setMode] = useState<Mode>('ready');
    const [streamOutput, setStreamOutput] = useState('');

    useEmitter(chat, 'stream:start', () => {
        setStreamOutput('');
        setMode('stream');
    });
    useEmitter(chat, 'stream:push', (content: string) => setStreamOutput(prev => prev + content));
    useEmitter(chat, 'stream:end', () => {
        setStreamOutput('');
        setMode('ready');
    });
    
    /**
     * Cancel/kill callbacks
     * - stopStream: used to stop the LLM chat stream, if there's one active
     * - shutdown: used when exiting the app
     */
    const stopStream = useCallback(() => {
        chat.stopStream();
    }, [chat]);
    
    const shutdown = useCallback(() => {
        process.stderr.write('shutdown called\n');
        chat.stopSession();
    }, [chat]);

    return {
        status,
        modelInfo,
        mode,
        streamOutput,
        history,
        setHistory,
        stopStream,
        shutdown,
    };
}