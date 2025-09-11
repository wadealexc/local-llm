import { Chat } from './chat.js';
import { Model } from './model.js';

export class User {

    public name: string;
    public model: Model;

    private chat: Chat;

    constructor(name: string, defaultModel: Model) {
        this.name = name;
        this.model = defaultModel;
        this.chat = new Chat(this.model.systemPrompt);
    }

    pushUserMessage(m: string) {
        this.chat.pushUserMessage(m);
        return this.chat.messages;
    }

    pushLLMMessage(m: string) {
        this.chat.pushLLMMessage(m);
    }
}