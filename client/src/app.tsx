import React, { useState } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';

import { type Message } from 'ollama';

// import ServerStatus from 
import ChatHistory from './components/chatHistory.js';

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

export default function App() {
	const { exit } = useApp();
	const [inputKey, setInputKey] = useState(0);
	const [curInput, setCurInput] = useState('');
	const [lastInput, setLastInput] = useState('');

	const [history, setHistory] = useState<Message[]>([{
		role: Role.System,
		content: 'This is the system prompt!'
	}]);

	// const [count, setCount] = useState(0);

	// useInput((input, key) => {
	// 	if (key.upArrow) {
	// 		setCount(c => c + 1);
	// 	}

	// 	if (key.downArrow) {
	// 		setCount(c => c - 1);
	// 	}
	// });

	return (
		// flexDirection defines how child elements are laid out in the box
		// "column" means top-to-bottom
		// "row" - left to right
		<Box flexDirection="column">
			<Box borderStyle="round" paddingX={1} width={64}>
				<Text>
					<Text color="green">●</Text><Text bold>  treehouse llm </Text>
					<Text dimColor color="blueBright">v0.0.1</Text>
					<Text>{"\nlastInput:"}{lastInput}</Text>
					<Text>{"\ncurInput:"}{curInput}</Text>
				</Text>
			</Box>

			<ChatHistory history={history}/>

			<Box borderStyle="round" paddingX={1}>
				<Text color="green">{'(fox) >  '}</Text>
				<TextInput
					key={inputKey}
					placeholder="chat with the llm"
					defaultValue={curInput}
					onChange={setCurInput}
					onSubmit={(entered) => {
						setLastInput(entered);
						setCurInput('');
						setInputKey(prev => prev + 1);
						setHistory(h => [...h, {
							role: Role.User,
							content: entered
						}]);
					}}
				/>
			</Box>
		</Box>
	);
}
