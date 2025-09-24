import { useCallback, useState } from 'react';

import { type ServerStatus, type ModelInfo } from '../common.js';
import { ChatSession } from '../chatSession.js';
import { useEmitter } from './useEmitter.js';

export function useChatSession(chat: ChatSession): {
    status: ServerStatus,
    modelInfo: ModelInfo,
    onScrollUp: () => void,
    onScrollDown: () => void,
    onPrevHistory: () => void,
    onNextHistory: () => void,
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
     * Scroll up/down callbacks
     * 
     * Scrolling up/down selects the prev/next message in the chat session
     */

    const onScrollUp = useCallback(() => {
        chat.selectParent();
    }, [chat]);

    const onScrollDown = useCallback(() => {
        chat.selectChild();
    }, [chat]);

    /**
     * Scroll left/right callbacks
     * 
     * Scrolling left/right selects the prev/next edit in the chat session
     */

    const onPrevHistory = useCallback(() => {
        chat.selectPrevThread();
    }, [chat]);

    const onNextHistory = useCallback(() => {
        chat.selectNextThread();
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
        onScrollUp, onScrollDown,
        onPrevHistory, onNextHistory,
        stopStream, shutdown,
    };
}