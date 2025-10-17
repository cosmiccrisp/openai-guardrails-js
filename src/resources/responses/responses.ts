/**
 * Responses API with guardrails.
 */
/* eslint-disable no-dupe-class-members */
import { OpenAI } from 'openai';
import { GuardrailsBaseClient, GuardrailsResponse } from '../../base-client';
import { TextOnlyMessageArray } from '../../types';

/**
 * Responses API with guardrails.
 */
export class Responses {
  constructor(private client: GuardrailsBaseClient) { }

  /**
   * Create response with guardrails.
   * 
   * Runs preflight first, then executes input guardrails concurrently with the LLM call.
   */
  // Overload: streaming
  create(
    params: {
      input: string | Array<{ role: string; content: unknown }>;
      model: string;
      stream: true;
      tools?: unknown[];
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Responses.ResponseCreateParams, 'input' | 'model' | 'stream' | 'tools'>
  ): Promise<AsyncIterableIterator<GuardrailsResponse>>;

  // Overload: non-streaming (default)
  create(
    params: {
      input: string | Array<{ role: string; content: unknown }>;
      model: string;
      stream?: false;
      tools?: unknown[];
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Responses.ResponseCreateParams, 'input' | 'model' | 'stream' | 'tools'>
  ): Promise<GuardrailsResponse<OpenAI.Responses.Response>>;

  async create(
    params: {
      input: string | Array<{ role: string; content: unknown }>;
      model: string;
      stream?: boolean;
      tools?: unknown[];
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Responses.ResponseCreateParams, 'input' | 'model' | 'stream' | 'tools'>
  ): Promise<GuardrailsResponse<OpenAI.Responses.Response> | AsyncIterableIterator<GuardrailsResponse>> {
    const { input, model, stream = false, tools, suppressTripwire = false, ...kwargs } = params;

    // Determine latest user message text when a list of messages is provided
    let latestMessage: string;
    let textOnlyMessages: TextOnlyMessageArray | undefined;
    if (Array.isArray(input)) {
      // Filter to text-only messages for guardrails (guardrails only work with text content)
      textOnlyMessages = input
        .filter((msg): msg is { role: string; content: string } => 
          typeof msg === 'object' && 
          msg !== null && 
          'role' in msg && 
          'content' in msg &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (msg as any).role === 'user' && 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof (msg as any).content === 'string'
        )
        .map(msg => ({ role: msg.role, content: msg.content }));
      [latestMessage] = this.client.extractLatestUserMessage(textOnlyMessages);
    } else {
      latestMessage = input;
    }

    // Preflight first (run checks on the latest user message text, with full conversation)
    const preflightResults = await this.client.runStageGuardrails(
      'pre_flight',
      latestMessage,
      textOnlyMessages,
      suppressTripwire,
      this.client.raiseGuardrailErrors
    );

    // Apply pre-flight modifications (PII masking, etc.)
    const modifiedInput = this.client.applyPreflightModifications(
      Array.isArray(input) ? textOnlyMessages! : input, 
      preflightResults
    );

    // Input guardrails and LLM call concurrently
    const [inputResults, llmResponse] = await Promise.all([
      this.client.runStageGuardrails(
        'input',
        latestMessage,
        textOnlyMessages,
        suppressTripwire,
        this.client.raiseGuardrailErrors
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.client as any)._resourceClient.responses.create({
        input: modifiedInput,
        model,
        stream,
        tools,
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
        textOnlyMessages || input,
        suppressTripwire
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (this.client as any).handleLlmResponse(
        llmResponse,
        preflightResults,
        inputResults,
        textOnlyMessages || input,
        suppressTripwire
      );
    }
  }
}
