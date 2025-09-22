// CLI dimensions
export type Dimensions = {
    columns: number;
    rows: number;
}

export type ServerStatus = 'not loaded' | 'online' | 'errors' | 'offline';

export type ModelInfo = {
    modelName: string;
    params: string;
    quantization: string;
};

// For chats with llms, messages are sent from one of three roles
export enum Role {
    User = "user",
    LLM = "assistant",
    System = "system",
};

export type ChatMsg = {
    role: Role;
    content: string;
}