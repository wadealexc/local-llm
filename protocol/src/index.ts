// /login
export interface LoginRequest {
    username: string
}

export interface LoginResponse {
    username: string;
    modelName: string
}

// /chat
export interface ChatRequest {
    username: string;
    message: string;
}

export interface ChatResponse {
    response: string;
}

// /models
export interface ModelsResponse {
    models: string[]
}