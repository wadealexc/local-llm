import React, { useState } from 'react';
import { Box, Text, Newline } from 'ink';
import TextInput from 'ink-text-input';
import { Spinner } from '@inkjs/ui';

import { ChatSession } from '../chatSession.js';
import { useEmitter } from '../hooks/useEmitter.js';
import { useChatStream } from '../hooks/useChatSession.js';
import Message, { LLMMessage } from './message.js';
import { Role, type ChatMsg } from '../common.js';

type Props = {
    chat: ChatSession;
    // setLastInput: (msg: string) => void;
}

enum Mode {
    USER_INPUT,
    STREAM_OUTPUT
}

export default function IOPanel({
    chat,
}: Props): React.ReactElement {

    const [userInput, setUserInput] = useState('');
    const [nextMessage, setNextMessage] = useState<ChatMsg | undefined>(undefined);

    const [mode, setMode] = useState<Mode>(Mode.USER_INPUT);
    const [streamOutput, setStreamOutput] = useState('');

    useChatStream({
        chat: chat,
        onStreamStart: () => {
            setStreamOutput('');
            setMode(Mode.STREAM_OUTPUT);
        },
        onStreamPush: (content: string) => {
            setStreamOutput(prev => prev + content);
        },
        onStreamEnd: () => {
            setStreamOutput('');
            setMode(Mode.USER_INPUT);
        },
        onStreamAbort: () => {
            setStreamOutput('');
            setMode(Mode.USER_INPUT);
        },
        onMsgNext: (msg: ChatMsg | undefined) => {
            if (msg && msg.role === Role.User) {
                setUserInput(msg.content);
            } else {
                setUserInput('');
            }
        }
    });

    return (
        <Box flexDirection="column">
            {/* Stream output, visible only when reading a stream from the chat session */}
            {mode === Mode.STREAM_OUTPUT && (
                <Box flexShrink={0}>
                    <LLMMessage content={streamOutput} />
                </Box>
            )}

            {/* User input / LLM thinking indicator, always visible */}
            <Box
                flexDirection="row"
                borderStyle="round"
                borderColor={mode === Mode.USER_INPUT ? "green" : "cyan"}
                flexShrink={0}
                paddingX={1}
            >
                {mode === Mode.USER_INPUT ? (
                    <TextInput
                        value={userInput}
                        placeholder="send a message"
                        onChange={setUserInput}
                        onSubmit={(entered) => {
                            setUserInput('');
                            chat.prompt(entered);
                        }}
                    />
                ) : (
                    <Spinner
                        type="bouncingBall"
                        label={`${chat.currentModel?.modelName} is thinking... (press ctrl+o to cancel)`}
                    />
                )}

                <Box flexShrink={0}></Box>
            </Box>

            <Box flexDirection="row" flexShrink={0} justifyContent="center">
                <Text italic={true} dimColor color="grey">ctrl+w to exit | enter to send | up/down arrow to scroll</Text>
            </Box>
        </Box>
    );
}