import React from 'react';
import { Box, Text, Newline } from 'ink';

import { Role, type ChatMsg } from '../common.js';

type Props = {
    m: ChatMsg,
    modelName: string | undefined,
    userName: string,
}

export default function Message({ 
    m,
    modelName,
    userName,
}: Props): React.ReactElement {
    let promptText: React.ReactElement;
    if (m.role === Role.System) {
        promptText = <Text color="red">{`(sys) >  `}</Text>;
    } else if (m.role === Role.LLM) {
        promptText = <Text color="cyan">{`(${modelName}) >  `}</Text>;
    } else {
        promptText = <Text color="green">{`(${userName}) >  `}</Text>;
    }

    return (
        <Box borderStyle="round" paddingX={1}>
            <Text>{promptText}{m.content}</Text>
        </Box>
    );
}