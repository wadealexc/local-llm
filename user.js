import { Chat } from './chat.js';

export class User {

    constructor(name, defaultModel) {
        this.name = name;
        this._model = defaultModel;
        this.chat = new Chat();
        this.chat.setSystemMessage(this.model.systemPrompt);
    }

    get model() {
        return this._model;
    }

    get messages() {
        return this.chat;
    }

    newChat() {
        this.chat = new Chat();
    }

    pushUserMessage(m) {
        this.chat.pushUserMessage(m);
        return this.chat.messages;
    }

    pushLLMMessage(m) {
        this.chat.pushLLMMessage(m);
    }
}