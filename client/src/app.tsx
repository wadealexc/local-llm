import React, { useState, useRef, useEffect, useReducer } from 'react';
import { Box, Text, Newline, Spacer, Static, useStdout, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';

import { ChatSession } from './chatSession.js';
import { useChatSession } from './useChatSession.js';
import { useStdoutDimensions } from './useStdoutDimensions.js';
import Status from './components/status.js';
import ModelInfo from './components/modelInfo.js';
import Message from './components/message.js';

enum Role {
    User = "user",
    LLM = "assistant",
    System = "system",
}

enum RoleName {
    User = "fox",
    LLM = "llm",
    System = "system",
}

type Props = {
	chat: ChatSession;
}

const APP_NAME = 'treehouse llm';
const APP_VERSION = 'v0.0.1';

export default function App({ chat }: Props): React.ReactElement {
	const { exit } = useApp();
	const { status, modelInfo, history, shutdown } = useChatSession(chat);
	const dimensions = useStdoutDimensions();
	const [ currentInput, setCurrentInput ] = useState('');
	const [ counter, setCounter ] = useState(0);

	useInput((input, key) => {
		setCurrentInput(input);

		if (key.ctrl && input.toLowerCase() === 'c') {
			shutdown();
			exit();
		}

		if (key.upArrow) {
			shutdown();
			exit();
		}

		// append test message
		if (key.downArrow) {
			if (counter % 2 === 0) {
				chat.pushMessage({
					role: Role.User,
					content: `bingus${counter}`
				});
			} else {
				chat.pushMessage({
					role: Role.LLM,
					content: `bingus${counter}`
				});
			}
			setCounter(prev => prev + 1);			
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

			{/* Message history */}
			<Box 
				flexDirection="column" 
				flexGrow={1} 
				flexShrink={1} 
				justifyContent="flex-end"
				overflow="hidden"
			>
				{ history.map((m, idx) => {
					return (
						<Box key={m.id} borderStyle="round" flexShrink={0} paddingX={1}>
							<Message
								m={m}
								modelName={modelInfo?.modelName}
								userName={chat.username}
							/>
						</Box>
					);
				})}
			</Box>			

			{/* Footer - will contain user input/stream output field (and hint text zone) */}
			<Box borderStyle="round" flexShrink={0} paddingX={1}>
				<Text>Type to chat with {modelInfo?.modelName}</Text>
			</Box>
			<Box flexShrink={0} paddingX={1}>
				<Text italic={true} dimColor color="grey">press up arrow to exit; press down arrow to push a message</Text>
			</Box>
			
		</Box>
	);
}

// export default function App({ chat }: Props): React.ReactElement {
// 	const { exit } = useApp();
// 	const [inputKey, setInputKey] = useState(0);
// 	const [curInput, setCurInput] = useState('');
// 	const [lastInput, setLastInput] = useState('');

// 	return (
// 		// flexDirection defines how child elements are laid out in the box
// 		// "column" means top-to-bottom
// 		// "row" - left to right
// 		<Box flexDirection="column">
			



// 			{/* <ChatHistory history={chat.history}/>

// 			<Box borderStyle="round" paddingX={1}>
// 				<Text>{chat.userPrompt()}</Text>
// 				<TextInput
// 					key={inputKey}
// 					placeholder="chat with the llm"
// 					defaultValue={curInput}
// 					onChange={setCurInput}
// 					onSubmit={(entered) => {
// 						setLastInput(entered);
// 						setCurInput('');
// 						setInputKey(prev => prev + 1);
// 						chat.prompt(entered);
// 					}}
// 				/>
// 			</Box> */}
// 		</Box>
// 	);
// }
