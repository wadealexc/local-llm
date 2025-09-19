import React from 'react';
import { Box, Text, Newline } from 'ink';

import { type ModelInfo } from '../common.js';

type Props = {
    modelInfo: ModelInfo | null;
}

/**
 * App/Server status box
 */
export default function ModelInfo({ modelInfo }: Props): React.ReactElement {
    if (!modelInfo) {
        return (
            <Box borderStyle="round" paddingX={1} width={64}>
                <Text dimColor color="grey">no model loaded</Text>
            </Box>
        );
    }

    // TODO: use ink: Spacer to force some things to the left or right
    return (
        <Box borderStyle="round" paddingX={1} width={64}>
            <Text>
                <Text bold>model: </Text><Text color="cyan">{modelInfo.modelName}</Text>
                <Newline />
                <Text dimColor color="grey">params: {modelInfo.params} | quant: {modelInfo.quantization}</Text>
            </Text>
        </Box>
    );
}