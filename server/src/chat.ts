import { type Message } from 'ollama';

const USER_ROLE = 'user';
const LLM_ROLE = 'assistant';
const SYSTEM_ROLE = 'system';

export class Chat {
    
    public messages: Message[];

    constructor(sysMsg: string) {
        this.messages = [];
        this.messages.push({ role: SYSTEM_ROLE, content: sysMsg });
    }

    pushUserMessage(m: string) {
        this.messages.push({ role: USER_ROLE, content: m });
    }

    pushLLMMessage(m: string) {
        this.messages.push({ role: LLM_ROLE, content: m });
    }

    setSystemMessage(m: string) {
        let mObj: Message = { role: SYSTEM_ROLE, content: m };

        if (this.messages.length > 0) {
            this.messages[0] = mObj;
        } else {
            this.messages.push(mObj);
        }
    }
}