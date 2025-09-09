
export class Model {

    constructor(model, info, systemPrompt) {
        this.name = model.name;
        this.capabilities = info.capabilities;
        this.canThink = info.capabilities.includes('thinking');
        this._systemPrompt = systemPrompt;
    }

    get systemPrompt() {
        return this._systemPrompt;
    }
}