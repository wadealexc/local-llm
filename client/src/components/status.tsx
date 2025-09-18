import React from 'react';
import { Box, Text, Newline } from 'ink';

import { type ServerStatus } from '../common.js';

type Props = {
    appName: string,
    appVersion: string,
    hostName: string,
    serverStatus: ServerStatus,
}

/**
 * App/Server status box
 */
export default function Status({ 
    appName, 
    appVersion, 
    hostName, 
    serverStatus,
}: Props): React.ReactElement {
    let statusText: React.ReactElement;
    if (serverStatus === 'not loaded') {
        statusText = <Text dimColor color="grey">● server not found</Text>;
    } else if (serverStatus === 'offline') {
        statusText = <Text dimColor color="red">● host offline ({hostName})</Text>;
    } else if (serverStatus === 'errors') {
        statusText = <Text dimColor color="orange">● host degraded ({hostName})</Text>;
    } else {
        statusText = <Text dimColor color="green">● host online ({hostName})</Text>;
    }

    return (
        <Box borderStyle="round" paddingX={1} width={64}>
            <Text>
                <Text bold>treehouse llm </Text><Text dimColor color="blueBright">v0.0.1</Text>
                <Newline />
                {statusText}
            </Text>
        </Box>
    );
}