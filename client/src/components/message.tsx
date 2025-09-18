import React from 'react';
import { Box, Text, Newline } from 'ink';
import chalk from 'chalk';

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
    if (m.role === Role.System) {
        return <Text>{chalk.red(`(sys) >  `)}{m.content}</Text>;
    } else if (m.role === Role.LLM) {
        return <Text>{chalk.cyan(`(${modelName}) >  `)}{m.content}</Text>;
    } else {
        return <Text>{chalk.green(`(${userName}) >  `)}{m.content}</Text>;
    }
}