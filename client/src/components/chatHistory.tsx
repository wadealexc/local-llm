import React, { useState } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';

import { type Message } from 'ollama';

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

export default function ChatHistory({ history }: { history: Message[] }) {
    return (
        <>
            {history.map((entry, idx) => {
                if (entry.role === Role.System) {
                    return (
                        <Box 
                            key={idx}
                            borderStyle="round" 
                            paddingX={1}
                        >
                            <Text color="red">{`(${RoleName.System}) >  `}</Text><Text>{entry.content}</Text>
                        </Box>
                    );
                } else if (entry.role === Role.LLM) {
                    return (
                        <Box 
                            key={idx}
                            borderStyle="round" 
                            paddingX={1}
                        >
                            <Text color="cyan">{`(${RoleName.LLM}) >  `}</Text><Text>{entry.content}</Text>
                        </Box>
                    );
                } else {
                    return (
                        <Box 
                            key={idx}
                            borderStyle="round" 
                            paddingX={1}
                        >
                            <Text color="green">{`(${RoleName.User}) >  `}</Text><Text>{entry.content}</Text>
                        </Box>
                    );
                }
            })}
        </>
    );
}