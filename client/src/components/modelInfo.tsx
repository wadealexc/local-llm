import React from 'react';
import { type ServerStatus } from '../common.js';
import { Box, Text, Newline } from 'ink';

type Props = {
    modelName: string,
    params: string,
    quantization: string,
    // capabilities: string[]
}

/**
 * App/Server status box
 */
export default function ModelInfo({ 
    modelName,
    params,
    quantization
}: Props): React.ReactElement {
    return (
        <Box borderStyle="round" paddingX={1} width={64}>
            <Text>
                <Text bold>model: </Text><Text color="cyan">{modelName}</Text>
                <Newline />
                <Text dimColor color="grey">params: {params} | quant: {quantization}</Text>
            </Text>
        </Box>
    );
}