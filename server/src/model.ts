import ollama from 'ollama';
import type { ModelResponse, ShowResponse, ModelDetails, Message, AbortableAsyncIterator, ChatResponse, ErrorResponse } from 'ollama';

export class Model {

    public name: string;
    public canThink: boolean;

    public parameterSize: string;
    public quantizationLevel: string;
    public capabilities: string[];

    constructor(model: ModelResponse, info: ShowResponse) {
        this.name = model.name;
        this.canThink = info.capabilities.includes('thinking');

        this.capabilities = info.capabilities;
        this.parameterSize = info.details.parameter_size;
        this.quantizationLevel = info.details.quantization_level;
    }

    chatStream(messages: Message[]): Promise<AbortableAsyncIterator<ChatResponse>> {
        return ollama.chat({
            model: this.name,
            messages: messages,
            stream: true,
        });
    }
}

export class MockModel extends Model {

    constructor(name: string) {
        const details: ModelDetails = {
            parent_model: '',
            format: '',
            family: '',
            families: [],
            parameter_size: '69B',
            quantization_level: '420_Q_XD',
        };
        super(
            {
                name: name,
                modified_at: new Date(),
                model: name,
                size: 420,
                digest: '',
                details: details,
                expires_at: new Date(),
                size_vram: 69,
            },
            {
                license: '',
                modelfile: '',
                parameters: '',
                template: '',
                system: '',
                details: details,
                messages: [],
                modified_at: new Date(),
                model_info: new Map<string, any>(),
                capabilities: []
            }
        );
    }

    // Stream a fixed sentence as if it were coming from a real model.
    // Supports iterator.abort().
    chatStream(_messages: Message[]): Promise<AbortableAsyncIterator<ChatResponse>> {
        const ctrl = new AbortController();
        const name = this.name;
        const createdAt = new Date();

        const gen = (async function* (): AsyncGenerator<ChatResponse | ErrorResponse> {
            const sentence = 
`This is a mock response from the server, streaming chunk by chunk like a real LLM.

The quick brown fox wandered through the overgrown garden, curious about every leaf and stone. It had no particular destination in mind; instead, it followed the faint scent of rain on the air and the soft rustle of insects moving in the grass. As the afternoon sun dipped behind the trees, the fox paused to listen to the world around it: the distant call of a bird, the creak of branches swaying in the breeze, and the quiet, steady hum of life that never seemed to stop.`;
            const chunks = sentence.split(/(\s+)/).filter(Boolean);
            const start = Date.now();

            const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

            for (const piece of chunks) {
                if (ctrl.signal.aborted) {
                    const e = new Error('aborted');
                    (e as any).name = 'AbortError';
                    throw e;
                }

                // Mimic text streamed from llm
                await sleep(25);

                yield {
                    model: name,
                    created_at: createdAt,
                    message: { role: 'assistant', content: piece },
                    done: false,
                    done_reason: '',
                    total_duration: 0,
                    load_duration: 0,
                    prompt_eval_count: 0,
                    prompt_eval_duration: 0,
                    eval_count: 0,
                    eval_duration: 0,
                };
            }

            // Final response should yield total duration
            const elapsedNs = BigInt(Date.now() - start) * 1_000_000n;
            return {
                model: name,
                created_at: createdAt,
                message: { role: 'assistant', content: '' },
                done: true,
                done_reason: '',
                total_duration: Number(elapsedNs),
                load_duration: 0,
                prompt_eval_count: 0,
                prompt_eval_duration: 0,
                eval_count: 0,
                eval_duration: 0,
            };
        })();

        //
        const forced = Object.assign(gen, {
            abort() { ctrl.abort('mock abort'); },
        }) as unknown as AbortableAsyncIterator<ChatResponse>;


        // Create the exact class the type expects:
        return Promise.resolve(forced);
    }
}