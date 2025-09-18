import React, { useState, useRef, useEffect, useReducer } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';

import { type Message } from 'ollama';

import { ChatSession } from './chatSession.js';
import { useChatSession } from './useChatSession.js';
import Status from './components/status.js';
import ModelInfo from './components/modelInfo.js';

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
	const { status, shutdown } = useChatSession(chat);

	useInput((input, key) => {
		console.log(`input: ${input}`);

		if (key.ctrl && input.toLowerCase() === 'c') {
			shutdown();
			exit();
		}

		if (key.upArrow) {
			shutdown();
			exit();
		}
	});

	useEffect(() => {
		setTimeout(() => {
			console.log('auto shutdown');
			shutdown();
			exit();
		}, 10000);
	}, []);

	return (
		<Box flexDirection="column">
			<Box flexDirection="row">
				{/* app+server status box */}
				<Status 
					appName={APP_NAME}
					appVersion={APP_VERSION}
					hostName={chat.server}
					serverStatus={status}
				/>
				{/* model info box */}
				<ModelInfo
					modelName='gpt-oss'
					params='8b'
					quantization='yeah sure'
				/>
			</Box>
			{/* <Box borderStyle="round" paddingX={1} width={64}>
				<Text>
					{ status ===  }
					<Text color="green">●</Text><Text bold>  treehouse llm </Text>
					<Text dimColor color="blueBright">v0.0.1</Text>
					<Text>{"\nlastInput:"}{lastInput}</Text>
					<Text>{"\ncurInput:"}{curInput}</Text>
				</Text>
			</Box> */}
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
