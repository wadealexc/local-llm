import { type ModelResponse, type ShowResponse } from 'ollama';

export class Model {

    public name: string;
    public capabilities: string[];
    public canThink: boolean;

    public systemPrompt: string;

    constructor(model: ModelResponse, info: ShowResponse, systemPrompt: string) {
        this.name = model.name;
        this.capabilities = info.capabilities;
        this.canThink = info.capabilities.includes('thinking');
        this.systemPrompt = systemPrompt;
    }
}