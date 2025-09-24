import type React from "react";
import { useLogs, useLogSend } from "../hooks/useLogs.js";
import { Box, Text } from "ink";
import type { LogEntry } from "../utils/logger.js";
import chalk, { type ChalkInstance } from "chalk";

type Props = {
    visible: boolean
}

export default function LogPanel({ visible }: Props): React.ReactElement | null {
    useLogSend('logpanel');
    const logs = useLogs();
    if (!visible) return null;
    
    return (
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-start" overflow="hidden">
            {logs.map((entry, idx) => {
                return (
                    <Box key={idx}>
                        {LogMessage(entry)}
                    </Box>
                );
            })}
        </Box>
    );
}

// ex: [t=14.233][iopanel] err: <message>
function LogMessage(entry: LogEntry): React.ReactElement {
    const secElapsedStr = chalk.dim.grey(`[t=${(Number(entry.msElapsed) / 1e3).toFixed(3).padStart(7, ' ')}]`);
    const nameStr = chalk.cyan(`[${entry.scope.padStart(12, ' ')}]`);

    let levelColor: ChalkInstance;
    if (entry.level === 'debug') {
        levelColor = chalk.yellow;
    } else if (entry.level === 'error') {
        levelColor = chalk.red;
    } else {
        levelColor = chalk.green;
    }
    
    const levelStr = levelColor(`${entry.level}:`.padEnd(7, ' '));
    const finalStr = `${secElapsedStr}${nameStr} ${levelStr} ${entry.text}`;
    return <Text>{finalStr}</Text>;
}