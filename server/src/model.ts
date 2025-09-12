import { type ModelResponse, type ShowResponse } from 'ollama';

export class Model {

    public name: string;
    public capabilities: string[];
    public canThink: boolean;

    constructor(model: ModelResponse, info: ShowResponse) {
        this.name = model.name;
        this.capabilities = info.capabilities;
        this.canThink = info.capabilities.includes('thinking');
    }
}