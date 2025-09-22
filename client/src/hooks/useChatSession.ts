import { useCallback, useEffect, useRef, useState } from 'react';

import { type ServerStatus, type ModelInfo, type ChatMsg } from '../common.js';
import { ChatSession } from '../chatSession.js';
import { useEmitter } from './useEmitter.js';

export function useChatSession(chat: ChatSession): {
    status: ServerStatus,
    modelInfo: ModelInfo,
    history: ChatMsg[],
    onScrollUp: () => void,
    onScrollDown: () => void,
    stopStream: () => void,
    shutdown: () => void,
} {
    // Server status
    const [status, setStatus] = useState<ServerStatus>(chat.serverStatus);
    useEmitter(chat, 'server:status', (s: ServerStatus) => setStatus(s));

    // Model info
    const [modelInfo, setModelInfo] = useState<ModelInfo>({
        modelName: 'undefined',
        params: '-',
        quantization: '-'
    });
    useEmitter(chat, 'model:set', (m: ModelInfo) => setModelInfo(m));

    /**
     * Scrollable chat history
     * 
     * (Concept adapted from https://github.com/sasaplus1/inks/blob/main/packages/ink-scroll-box)
     */
    const [history, setHistory] = useState<ChatMsg[]>([]);
    useEmitter(chat, 'message:set', (hist) => setHistory(hist));
    
    const onScrollUp = useCallback(() => {
        chat.selectParent();
    }, [chat]);

    const onScrollDown = useCallback(() => {
        chat.selectChild();
    }, [chat]);
    
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
        history, onScrollUp, onScrollDown,
        stopStream, shutdown,
    };
}

export function useChatStream(params: {
    chat: ChatSession, 
    onStreamStart: () => void,
    onStreamPush: (content: string) => void,
    onStreamEnd: () => void,
    onStreamAbort: () => void,
    onMsgNext: (msg: ChatMsg | undefined) => void
}) {
    useEmitter(params.chat, 'stream:start', () => params.onStreamStart());
    useEmitter(params.chat, 'stream:push', (content: string) => params.onStreamPush(content));
    useEmitter(params.chat, 'stream:end', () => params.onStreamEnd());
    useEmitter(params.chat, 'stream:abort', () => params.onStreamAbort());
    useEmitter(params.chat, 'message:next', (msg: ChatMsg | undefined) => params.onMsgNext(msg));
}