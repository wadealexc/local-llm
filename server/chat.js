const USER_ROLE = 'user';
const LLM_ROLE = 'assistant';
const SYSTEM_ROLE = 'system';

export class Chat {
    
    constructor(sysMsg) {
        this._messages = [];
        this._messages.push({ role: SYSTEM_ROLE, content: sysMsg });
    }

    get messages() {
        return this._messages;
    }

    pushUserMessage(m) {
        this._messages.push({ role: USER_ROLE, content: m });
    }

    pushLLMMessage(m) {
        this._messages.push({ role: LLM_ROLE, content: m });
    }

    setSystemMessage(m) {
        let mObj = { role: SYSTEM_ROLE, content: m };

        if (this._messages.length > 0) {
            this._messages[0] = mObj;
        } else {
            this._messages.push(mObj);
        }
    }
}