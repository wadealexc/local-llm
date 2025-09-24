import React, { useState } from 'react';

import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { Spinner } from '@inkjs/ui';
import chalk from 'chalk';

import { ChatSession } from '../chatSession.js';
import { useEmitter } from '../hooks/useEmitter.js';
import { LLMMessage } from './message.js';
import { Role } from '../common.js';
import type { NodeInfo } from '../utils/chatTree.js';
import { useLogSend } from '../hooks/useLogs.js';

type Props = {
    chat: ChatSession;
}

enum Mode {
    USER_INPUT,
    STREAM_OUTPUT
}

export default function IOPanel({
    chat,
}: Props): React.ReactElement {

    const log = useLogSend('iopanel');

    const [userInput, setUserInput] = useState('');
    const [mode, setMode] = useState<Mode>(Mode.USER_INPUT);
    const [streamOutput, setStreamOutput] = useState('');

    const [position, setPosition] = useState<{
        idx: number,
        length: number
    } | undefined>(undefined);

    /**
     * Stream event listeners
     */

    useEmitter(chat, 'stream:start', () => {
        setStreamOutput('');
        setMode(Mode.STREAM_OUTPUT);
        log.info('stream:start');
    });

    useEmitter(chat, 'stream:push', (content: string) => {
        setStreamOutput(prev => prev + content);
    });

    useEmitter(chat, 'stream:end', () => {
        setStreamOutput('');
        setMode(Mode.USER_INPUT);
        log.info('stream:end');
    });

    useEmitter(chat, 'stream:abort', () => {
        setStreamOutput('');
        setMode(Mode.USER_INPUT);
        log.info('stream:abort');
    });

    // `info.nextMessage` displays the next message in the linear chat history, if it
    // exists. This is used when we scroll between messages/edits, as the 'next' message
    // is rendered in the message history, but is used to populate the user input bar.
    //
    // TODO - this is somewhat janky, and we're missing a feature - remembering
    // what the user was typing at the very bottom of the chat window.
    useEmitter(chat, 'message:set', (info: NodeInfo) => {
        log.info(`next message from: ${info.nextMessage?.role} | history length: ${info.history.length}`);
        setPosition(info.lastThreadPosition);
        
        if (info.nextMessage && info.nextMessage.role === Role.User) {
            setUserInput(info.nextMessage.content);
        } else {
            setUserInput('');
        }
    });

    const calcSiblingString = (pos: { idx: number, length: number } | undefined): string => {
        return pos ? chalk.magenta(` [${pos.idx+1} of ${pos.length}] `) : '';
    };

    return (
        <Box flexDirection="column" flexShrink={0}>
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
                            log.info('user submitted text');
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

            {/* Command hint box */}
            <Box flexDirection="row" flexShrink={0} alignSelf="center">
                <Box flexDirection="row" flexShrink={0} alignSelf="center">
                    <Text italic={true}>
                        {position 
                            ? `${chalk.bold('ctrl+w')}: exit | ${chalk.bold('pgUp/pgDn')}: scroll window | ${chalk.bold('ctrl+left/right')}: change threads`
                            : `${chalk.bold('ctrl+w')}: exit | ${chalk.bold('pgUp/pgDn')}: scroll window`
                        }
                    </Text>
                </Box>

                <Box flexDirection="row" flexShrink={0} alignSelf="flex-end">
                    <Text dimColor>{calcSiblingString(position)}</Text>
                </Box>
            </Box>
        </Box>
    );
}