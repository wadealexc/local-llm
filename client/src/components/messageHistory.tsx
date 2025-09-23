import React, { useMemo, useState } from 'react';
import type { ChatSession } from "../chatSession.js"
import { useEmitter } from '../hooks/useEmitter.js';
import type { ChatMsg } from '../common.js';
import { Box } from 'ink';
import Message from './message.js';
import type { NodeInfo } from '../utils/chatTree.js';

type Props = {
    chat: ChatSession;
}

export default function MessageHistory({ chat }: Props): React.ReactElement {

    /**
     * Scrollable chat history
     * 
     * (Concept adapted from https://github.com/sasaplus1/inks/blob/main/packages/ink-scroll-box)
     */
    const [history, setHistory] = useState<ChatMsg[]>([]);
    useEmitter(chat, 'message:set', (info: NodeInfo) => setHistory(info.history));

    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
            {history.map((m, idx) => {
                return <Message key={idx} m={m}/>;
            })}
        </Box>
    );
}