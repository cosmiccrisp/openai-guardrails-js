/**
 * Responses API with guardrails.
 */

import { OpenAI } from 'openai';
import { GuardrailsBaseClient, GuardrailsResponse } from '../../base-client';

/**
 * Responses API with guardrails.
 */
export class Responses {
  constructor(private client: GuardrailsBaseClient) {}

  /**
   * Create response with guardrails.
   *
   * Runs preflight first, then executes input guardrails concurrently with the LLM call.
   */
  async create(
    params: {
      input: string | any[];
      model: string;
      stream?: boolean;
      tools?: any[];
      suppressTripwire?: boolean;
    } & Omit<OpenAI.Responses.ResponseCreateParams, 'input' | 'model' | 'stream' | 'tools'>
  ): Promise<GuardrailsResponse<OpenAI.Responses.Response>> {
    const { input, model, stream = false, tools, suppressTripwire = false, ...kwargs } = params;

    // Determine latest user message text when a list of messages is provided
    let latestMessage: string;
    if (Array.isArray(input)) {
      [latestMessage] = (this.client as any).extractLatestUserMessage(input);
    } else {
      latestMessage = input;
    }

    // Preflight first (run checks on the latest user message text, with full conversation)
    const preflightResults = await (this.client as any).runStageGuardrails(
      'pre_flight',
      latestMessage,
      input,
      suppressTripwire,
      this.client.raiseGuardrailErrors
    );

    // Apply pre-flight modifications (PII masking, etc.)
    const modifiedInput = (this.client as any).applyPreflightModifications(input, preflightResults);

    // Input guardrails and LLM call concurrently
    const [inputResults, llmResponse] = await Promise.all([
      (this.client as any).runStageGuardrails(
        'input',
        latestMessage,
        input,
        suppressTripwire,
        this.client.raiseGuardrailErrors
      ),
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
        input,
        suppressTripwire
      );
    } else {
      return (this.client as any).handleLlmResponse(
        llmResponse,
        preflightResults,
        inputResults,
        input,
        suppressTripwire
      );
    }
  }
}
