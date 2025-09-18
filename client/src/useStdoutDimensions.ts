
import { useEffect, useState } from 'react';
import { useStdout } from 'ink';

import { type Dimensions } from './common.js';

// Get CLI dimensions that update when the CLI is resized
export function useStdoutDimensions(): Dimensions {
    const { stdout } = useStdout();
    const [ dimensions, setDimensions ] = useState<Dimensions>({
        columns: stdout.columns,
        rows: stdout.rows,
    });

    useEffect(() => {
        const handler = () => setDimensions({
            columns: stdout.columns,
            rows: stdout.rows,
        });

        stdout.on("resize", handler);
        return () => {
            stdout.off("resize", handler);
        };
    }, [stdout]);

    return dimensions;
}