import React, { useState, useRef, useEffect, useReducer, useMemo } from 'react';
import { Box, Text, Newline, Spacer, Static, useStdout, useInput, useApp } from 'ink';
import { Spinner } from '@inkjs/ui';
import TextInput from 'ink-text-input';
import chalk from 'chalk';

import { ChatSession } from './chatSession.js';
import { useChatSession } from './hooks/useChatSession.js';
import { useStdoutDimensions } from './hooks/useStdoutDimensions.js';
import IOPanel from './components/iopanel.js';
import Status from './components/status.js';
import ModelInfo from './components/modelInfo.js';
import Message from './components/message.js';
import { Role } from './common.js';

type Props = {
	chat: ChatSession;
}

const APP_NAME = 'treehouse llm';
const APP_VERSION = 'v0.0.1';

export default function App({ chat }: Props): React.ReactElement {
	const { exit } = useApp();
	const dimensions = useStdoutDimensions();

	const {
		status,
		modelInfo,
		history, onScrollUp, onScrollDown,
		stopStream, shutdown
	} = useChatSession(chat);

	const [userInput, setUserInput] = useState('');
	const [lastInput, setLastInput] = useState('');
	const [promptTrim, setPromptTrim] = useState(0);

	// Broken/wonky:
	// ctrl+c
	// ctrl+m
	//
	// probably want like a single 'input manager' to direct input rather than competition b/w `useInput/TextInput`
	useInput((input, key) => {
		if (key.downArrow) {
			onScrollDown();
		}

		if (key.upArrow) {
			onScrollUp();
		}
		
		// ink/src/hooks/use-input.ts has some special handling for ctrl+c
		// i think we can read that sequence here, but probably need to init useInput differently somehow
		if (key.ctrl) {
			if (input.toLowerCase() === 'w') {
				shutdown();
				exit();
			}
			
			if (input.toLowerCase() === 'o') {
				stopStream();
			}

			// if (key.rightArrow) {
			// 	// TODO history switch	
			// }
		}
	});

	return (
		<Box flexDirection="column" height={dimensions.rows} width={dimensions.columns}>
			<Box flexDirection="row" flexShrink={0} paddingTop={1}>
				{/* app+server status box */}
				<Status
					appName={APP_NAME}
					appVersion={APP_VERSION}
					hostName={chat.server}
					serverStatus={status}
				/>
				{/* model info box */}
				<ModelInfo modelInfo={modelInfo} />
			</Box>

			{/* Scrollable message history */}
			<Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
				{history.map((m, idx) => {
					return (
						<Message
							key={idx}
							m={m}
							modelName={modelInfo?.modelName}
							userName={chat.username}
						/>
					);
				})}
			</Box>

			{/* user input/llm output */}
			<IOPanel chat={chat} />
		</Box>
	);
}