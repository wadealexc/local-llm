import React from 'react';
import { Box, Text, Newline } from 'ink';
import chalk from 'chalk';

import { Role, type ChatMsg } from '../common.js';

type Props = {
    m: ChatMsg;
    modelName: string | undefined;
    userName: string;
}

type LLMMsgProps = {
    content: string;
}

export default function Message({
    m,
    modelName,
    userName,
}: Props): React.ReactElement {
    if (m.role === Role.System) {
        return (
            <Box borderStyle="double" borderTop={true} borderBottom={true} flexShrink={0} paddingX={1}>
                <Text>{chalk.red(`system prompt:\n`)}{m.content}</Text>
            </Box>
        );
    } else if (m.role === Role.LLM) {
        return LLMMessage({ content: m.content });
    } else {
        return (
            <Box
                flexDirection="row"
                borderStyle="round"
                borderColor="green"
                flexShrink={0}
                alignSelf="flex-end"
                paddingLeft={2}
                paddingRight={2}
            >
                {/* <Box borderStyle='round'><Text>{m.content}</Text></Box> */}
                <Text>{m.content}</Text>
            </Box>
        );
    }
}

export function LLMMessage({ content }: LLMMsgProps): React.ReactElement {
    return (
        <Box
            flexDirection="row"
            flexShrink={0}
            alignSelf="flex-start"
            paddingLeft={2}
            paddingRight={2}
        >
            <Text>{content}</Text>
        </Box>
    );
}