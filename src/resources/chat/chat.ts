/**
 * Chat completions with guardrails.
 */

import { OpenAI } from 'openai';
import { GuardrailsBaseClient, GuardrailsResponse } from '../../base-client';
import { GuardrailTripwireTriggered } from '../../exceptions';

/**
 * Chat completions with guardrails.
 */
export class Chat {
    constructor(private client: GuardrailsBaseClient) {}

    get completions(): ChatCompletions {
        return new ChatCompletions(this.client);
    }
}

/**
 * Chat completions interface with guardrails.
 */
export class ChatCompletions {
    constructor(private client: GuardrailsBaseClient) {}

    /**
     * Create chat completion with guardrails.
     * 
     * Runs preflight first, then executes input guardrails concurrently with the LLM call.
     */
    async create(
        params: {
            messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
            model: string;
            stream?: boolean;
            suppressTripwire?: boolean;
        } & Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, 'messages' | 'model' | 'stream'>
    ): Promise<GuardrailsResponse<OpenAI.Chat.Completions.ChatCompletion>> {
        const { messages, model, stream = false, suppressTripwire = false, ...kwargs } = params;
        
        const [latestMessage] = (this.client as any).extractLatestUserMessage(messages);

        // Preflight first
        const preflightResults = await (this.client as any).runStageGuardrails(
            'pre_flight',
            latestMessage,
            messages,
            suppressTripwire,
            this.client.raiseGuardrailErrors
        );

        // Apply pre-flight modifications (PII masking, etc.)
        const modifiedMessages = (this.client as any).applyPreflightModifications(
            messages,
            preflightResults
        );

        // Run input guardrails and LLM call concurrently
        const [inputResults, llmResponse] = await Promise.all([
            (this.client as any).runStageGuardrails(
                'input',
                latestMessage,
                messages,
                suppressTripwire,
                this.client.raiseGuardrailErrors
            ),
            (this.client as any)._resourceClient.chat.completions.create({
                messages: modifiedMessages,
                model,
                stream,
                ...kwargs
            })
        ]);

        // Handle streaming vs non-streaming
        if (stream) {
            const { StreamingMixin } = require('../../streaming');
            return StreamingMixin.streamWithGuardrailsSync(
                this.client,
                llmResponse,
                preflightResults,
                inputResults,
                messages,
                suppressTripwire
            );
        } else {
            return (this.client as any).handleLlmResponse(
                llmResponse,
                preflightResults,
                inputResults,
                messages,
                suppressTripwire
            );
        }
    }
}