const USER_ROLE = 'user';
const LLM_ROLE = 'assistant';

export class User {

    constructor(name) {
        this.name = name;
        this.chat = [];
    }

    get messages() {
        return this.chat;
    }

    pushUserMessage(m) {
        this.chat.push({ role: USER_ROLE, content: m });
        return this.chat;
    }

    pushLLMMessage(m) {
        this.chat.push({ role: LLM_ROLE, content: m });
    }
}