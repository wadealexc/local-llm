// For chats with llms, messages are sent from one of three roles
export enum Role {
    User = "user",
    LLM = "assistant",
    System = "system",
};

export type ServerStatus = 'not loaded' | 'online' | 'errors' | 'offline';