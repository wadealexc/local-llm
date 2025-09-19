import React, { useState, useRef, useEffect, useReducer } from 'react';
import { Box, Text, Newline, Spacer, Static, useStdout, useInput, useApp } from 'ink';
import { Spinner } from '@inkjs/ui';
import TextInput from 'ink-text-input';
import chalk from 'chalk';

import { ChatSession } from './chatSession.js';
import { useChatSession } from './hooks/useChatSession.js';
import { useStdoutDimensions } from './hooks/useStdoutDimensions.js';
import Status from './components/status.js';
import ModelInfo from './components/modelInfo.js';
import Message from './components/message.js';

type Props = {
	chat: ChatSession;
}

const APP_NAME = 'treehouse llm';
const APP_VERSION = 'v0.0.1';

export default function App({ chat }: Props): React.ReactElement {
	const { exit } = useApp();
	const dimensions = useStdoutDimensions();

	const { status, modelInfo, history, setHistory, shutdown } = useChatSession(chat);
	const [ userInput, setUserInput ] = useState('');

	const [ mode, setMode ] = useState<'ready' | 'stream'>('ready');

	// Broken/wonky:
	// ctrl+c
	// ctrl+m
	//
	// probably want like a single 'input manager' to direct input rather than competition b/w `useInput/TextInput`
	useInput((input, key) => {
		// ink/src/hooks/use-input.ts has some special handling for ctrl+c
		// i think we can read that sequence here, but probably need to init useInput differently somehow
		if (key.ctrl) {
			if (input.toLowerCase() === 'w') {
				shutdown();
				exit();
			} else if (input.toLowerCase() === 'o') {
				if (mode === 'ready') {
					setMode('stream');
				} else {
					setMode('ready');
				}
			}
		}

		// 'scroll down' => trim one fewer message from the view
		if (key.downArrow) {
			if (history.trim > 0) setHistory(prev => ({ hist: prev.hist, trim: prev.trim - 1 }));
		}

		// 'scroll up' => trim an additional message from the view
		if (key.upArrow) {
			if (history.trim < history.hist.length - 1) setHistory(prev => ({ hist: prev.hist, trim: prev.trim + 1 }));
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
				<ModelInfo modelInfo={modelInfo}/>
			</Box>

			{/* Scrollable message history */}
			<Box flexDirection="column" flexShrink={1} flexGrow={1} justifyContent="flex-end" overflow="hidden">
				{ history.hist.map((m, idx) => {
					return (
						<Box key={m.id} borderStyle="round" flexShrink={0} paddingX={1}>
							<Message
								m={m}
								modelName={modelInfo?.modelName}
								userName={chat.username}
							/>
						</Box>
					);
				}).slice(0, history.hist.length - history.trim) }
			</Box>

			{/* TODO - on submit, hide user input and show stream component */}
			{/* Footer - will contain user input/stream output field (and hint text zone) */}
			{mode === 'ready' && (
				<Box flexDirection="row" borderStyle="round" flexShrink={0} paddingX={1}>
					<Box flexShrink={0}><Text>{chalk.green(`(${chat.username}) >  `)}</Text></Box>

					{/* <Text>Type to chat with {modelInfo?.modelName}</Text> */}
					<TextInput
						value={userInput}
						placeholder={`mode: ready (standard) trimmed messages: ${history.trim}`}
						onChange={setUserInput}
						onSubmit={(entered) => {
							setUserInput('');
							chat.prompt(entered);
						}}
					/>

					<Box flexShrink={0}></Box>
				</Box>
			)}

			{mode === 'stream' && (
				<Box flexDirection="row" borderStyle="round" flexShrink={0} paddingX={1}>
					<Spinner label={`${modelInfo?.modelName} is thinking...`}/>

					<Box flexShrink={0}></Box>
				</Box>
			)}
			
			<Box flexShrink={0} paddingX={1}>
				<Text italic={true} dimColor color="grey">press ctrl+w to exit; press ctrl+o to switch modes</Text>
			</Box>
		</Box>
	);
}