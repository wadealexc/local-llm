import { type Message } from 'ollama';

// /chat
export interface ChatRequest {
    username: string;
    modelName: string;
    messages: Message[];
}

export interface ChatResponse {
    response: string;
    totalDuration: number;
}

// /models
export interface ModelsResponse {
    models: string[];
}