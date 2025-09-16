import { type Message } from 'ollama';

// /chat
export interface ChatRequest {
    username: string;
    modelName: string;
    messages: Message[];
}

export interface ChatDelta {
    type: 'delta';
    content: string;
}

export interface ChatDone {
    type: 'done';
    fullResponse: string;
    totalDuration: number;
}

export interface ChatError {
    type: 'error';
    message: string;
}

export type ChatEvent = ChatDelta | ChatDone | ChatError;

// /models
export interface ModelsResponse {
    models: string[];
}

// /modelInfo
export interface ModelInfoRequest {
    modelName: string;
}

export interface ModelInfoResponse {
    parameterSize: string;
    quantizationLevel: string;
    capabilities: string[];
}