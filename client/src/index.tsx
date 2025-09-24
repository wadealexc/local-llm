import { render } from 'ink';

import App from './app.js';
import { ChatSession } from './chatSession.js';

const SERVER: string = "http://oak.lan:8000";

let username = 'fox';

const chat = new ChatSession(SERVER, username);
chat.startSession();

render(<App chat={chat} />);