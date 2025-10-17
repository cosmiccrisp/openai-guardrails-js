/**
 * Chat completions with guardrails.
 */

/* eslint-disable no-dupe-class-members */
import { OpenAI } from 'openai';
import { GuardrailsBaseClient, GuardrailsResponse } from '../../base-client';

// Note: We need to filter out non-text content since guardrails only work with text
// The existing extractLatestUserMessage method expects TextOnlyMessageArray

/**
 * Chat completions with guardrails.
 */
export class Chat {
  constructor(private client: GuardrailsBaseClient) { }

  get completions(): ChatCompletions {
    return new ChatCompletions(this.client);
  }
}

/**
 * Chat completions interface with guardrails.
 */
export class ChatCompletions {
  constructor(private client: GuardrailsBaseClient) { }

  /**
   * Create chat completion with guardrails.
   * 
   * Runs preflight first, then executes input guardrails concurrently with the LLM call.
   */
  // Overload: streaming
  create(
    params: {
      messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      model: string;
      stream: true;
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, 'messages' | 'model' | 'stream'>
  ): Promise<AsyncIterableIterator<GuardrailsResponse>>;

  // Overload: non-streaming (default)
  create(
    params: {
      messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      model: string;
      stream?: false;
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, 'messages' | 'model' | 'stream'>
  ): Promise<GuardrailsResponse<OpenAI.Chat.Completions.ChatCompletion>>;

  async create(
    params: {
      messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      model: string;
      stream?: boolean;
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, 'messages' | 'model' | 'stream'>
  ): Promise<GuardrailsResponse<OpenAI.Chat.Completions.ChatCompletion> | AsyncIterableIterator<GuardrailsResponse>> {
    const { messages, model, stream = false, suppressTripwire = false, ...kwargs } = params;

    // Filter to text-only messages for guardrails (guardrails only work with text content)
    const textOnlyMessages = messages
      .filter((msg): msg is OpenAI.Chat.Completions.ChatCompletionUserMessageParam => 
        msg.role === 'user' && typeof msg.content === 'string'
      )
      .map(msg => ({ role: msg.role, content: msg.content as string }));
    
    const [latestMessage] = this.client.extractLatestUserMessage(textOnlyMessages);

    // Preflight first
    const preflightResults = await this.client.runStageGuardrails(
      'pre_flight',
      latestMessage,
      textOnlyMessages,
      suppressTripwire,
      this.client.raiseGuardrailErrors
    );

    // Apply pre-flight modifications (PII masking, etc.)
    const modifiedMessages = this.client.applyPreflightModifications(
      textOnlyMessages,
      preflightResults
    );

    // Run input guardrails and LLM call concurrently
    const [inputResults, llmResponse] = await Promise.all([
      this.client.runStageGuardrails(
        'input',
        latestMessage,
        textOnlyMessages,
        suppressTripwire,
        this.client.raiseGuardrailErrors
      ),
      // Access protected _resourceClient - necessary for external resource classes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.client as any)._resourceClient.chat.completions.create({
        messages: modifiedMessages,
        model,
        stream,
        ...kwargs,
      }),
    ]);

    // Handle streaming vs non-streaming
    if (stream) {
      const { StreamingMixin } = require('../../streaming');
      return StreamingMixin.streamWithGuardrailsSync(
        this.client,
        llmResponse,
        preflightResults,
        inputResults,
        textOnlyMessages,
        suppressTripwire
      );
    } else {
      // Access protected handleLlmResponse - necessary for external resource classes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this.client as any).handleLlmResponse(
        llmResponse,
        preflightResults,
        inputResults,
        textOnlyMessages,
        suppressTripwire
      );
    }
  }
}
