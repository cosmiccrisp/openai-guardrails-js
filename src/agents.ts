/**
 * GuardrailAgent: Drop-in replacement for Agents SDK Agent with automatic guardrails.
 *
 * This module provides the GuardrailAgent class that acts as a factory for creating
 * Agents SDK Agent instances with guardrails automatically configured from a pipeline
 * configuration file.
 */

import { GuardrailLLMContext } from './types';
import { loadPipelineBundles, instantiateGuardrails, PipelineConfig } from './runtime';

/**
 * Drop-in replacement for Agents SDK Agent with automatic guardrails integration.
 *
 * This class acts as a factory that creates a regular Agents SDK Agent instance
 * with guardrails automatically configured from a pipeline configuration.
 *
 * Instead of manually creating guardrails and wiring them to an Agent, users can
 * simply provide a guardrails configuration file and get back a fully configured
 * Agent that works exactly like a regular Agents SDK Agent.
 *
 * @example
 * ```typescript
 * // Use GuardrailAgent directly:
 * const agent = await GuardrailAgent.create(
 *   "config.json",
 *   "Customer support agent",
 *   "You are a customer support agent..."
 * );
 * // Returns a regular Agent instance that can be used with run()
 * ```
 */
export class GuardrailAgent {
  /**
   * Create a new Agent instance with guardrails automatically configured.
   *
   * This method acts as a factory that:
   * 1. Loads the pipeline configuration
   * 2. Generates appropriate guardrail functions for Agents SDK
   * 3. Creates and returns a regular Agent instance with guardrails wired
   *
   * @param config Pipeline configuration (file path, dict, or JSON string)
   * @param name Agent name
   * @param instructions Agent instructions
   * @param agentKwargs All other arguments passed to Agent constructor
   * @param raiseGuardrailErrors If true, raise exceptions when guardrails fail to execute.
   *   If false (default), treat guardrail errors as safe and continue execution.
   * @returns A fully configured Agent instance ready for use with run()
   *
   * @throws {Error} If agents package is not available
   * @throws {Error} If configuration is invalid
   * @throws {Error} If raiseGuardrailErrors=true and a guardrail fails to execute
   */
  static async create(
    config: string | PipelineConfig,
    name: string,
    instructions: string,
    agentKwargs: Record<string, any> = {},
    raiseGuardrailErrors: boolean = false
  ): Promise<any> {
    // Returns agents.Agent
    try {
      // Dynamic import to avoid bundling issues
      const agentsModule = await import('@openai/agents');
      const { Agent } = agentsModule;

      // Load the pipeline configuration
      const pipeline = await loadPipelineBundles(config);

      // Create input guardrails from pre_flight and input stages
      const inputGuardrails = [];
      if ((pipeline as any).pre_flight) {
        const preFlightGuardrails = await createInputGuardrailsFromStage(
          'pre_flight',
          (pipeline as any).pre_flight,
          undefined,
          raiseGuardrailErrors
        );
        inputGuardrails.push(...preFlightGuardrails);
      }
      if ((pipeline as any).input) {
        const inputStageGuardrails = await createInputGuardrailsFromStage(
          'input',
          (pipeline as any).input,
          undefined,
          raiseGuardrailErrors
        );
        inputGuardrails.push(...inputStageGuardrails);
      }

      // Create output guardrails from output stage
      const outputGuardrails = [];
      if ((pipeline as any).output) {
        const outputStageGuardrails = await createOutputGuardrailsFromStage(
          'output',
          (pipeline as any).output,
          undefined,
          raiseGuardrailErrors
        );
        outputGuardrails.push(...outputStageGuardrails);
      }

      return new Agent({
        name,
        instructions,
        inputGuardrails,
        outputGuardrails,
        ...agentKwargs,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot resolve module')) {
        throw new Error(
          'The @openai/agents package is required to use GuardrailAgent. ' +
            'Please install it with: npm install @openai/agents'
        );
      }
      throw error;
    }
  }
}

async function createInputGuardrailsFromStage(
  stageName: string,
  stageConfig: any,
  context?: GuardrailLLMContext,
  raiseGuardrailErrors: boolean = false
): Promise<any[]> {
  // Instantiate guardrails for this stage
  const guardrails = await instantiateGuardrails(stageConfig);

  return guardrails.map((guardrail: any) => ({
    name: `${stageName}: ${guardrail.name || guardrail.definition?.name || 'Unknown Guardrail'}`,
    execute: async ({ input, context: agentContext }: { input: string; context?: any }) => {
      try {
        // Create a proper context with OpenAI client if needed
        let guardContext = context || agentContext || {};
        if (!guardContext.guardrailLlm) {
          const { OpenAI } = require('openai');
          guardContext = {
            ...guardContext,
            guardrailLlm: new OpenAI(),
          };
        }

        const result = await guardrail.run(guardContext, input);

        // Check for execution failures when raiseGuardrailErrors=true
        if (raiseGuardrailErrors && result.executionFailed) {
          throw result.originalException;
        }

        return {
          outputInfo: result.info || null,
          tripwireTriggered: result.tripwireTriggered || false,
        };
      } catch (error) {
        if (raiseGuardrailErrors) {
          // Re-raise the exception to stop execution
          throw error;
        } else {
          // When raiseGuardrailErrors=false, treat errors as safe and continue execution
          // Return tripwireTriggered=false to allow execution to continue
          return {
            outputInfo: {
              error: error instanceof Error ? error.message : String(error),
              guardrail_name: guardrail.name || 'unknown',
            },
            tripwireTriggered: false,
          };
        }
      }
    },
  }));
}

async function createOutputGuardrailsFromStage(
  stageName: string,
  stageConfig: any,
  context?: GuardrailLLMContext,
  raiseGuardrailErrors: boolean = false
): Promise<any[]> {
  // Instantiate guardrails for this stage
  const guardrails = await instantiateGuardrails(stageConfig);

  return guardrails.map((guardrail: any) => ({
    name: `${stageName}: ${guardrail.name || guardrail.definition?.name || 'Unknown Guardrail'}`,
    execute: async ({
      agentOutput,
      context: agentContext,
    }: {
      agentOutput: any;
      context?: any;
    }) => {
      try {
        // Extract the output text - could be in different formats
        let outputText = '';
        if (typeof agentOutput === 'string') {
          outputText = agentOutput;
        } else if (agentOutput?.response) {
          outputText = agentOutput.response;
        } else if (agentOutput?.finalOutput) {
          outputText =
            typeof agentOutput.finalOutput === 'string'
              ? agentOutput.finalOutput
              : JSON.stringify(agentOutput.finalOutput);
        } else {
          // Try to extract any string content
          outputText = JSON.stringify(agentOutput);
        }

        // Create a proper context with OpenAI client if needed
        let guardContext = context || agentContext || {};
        if (!guardContext.guardrailLlm) {
          const { OpenAI } = require('openai');
          guardContext = {
            ...guardContext,
            guardrailLlm: new OpenAI(),
          };
        }

        const result = await guardrail.run(guardContext, outputText);

        // Check for execution failures when raiseGuardrailErrors=true
        if (raiseGuardrailErrors && result.executionFailed) {
          throw result.originalException;
        }

        return {
          outputInfo: result.info || null,
          tripwireTriggered: result.tripwireTriggered || false,
        };
      } catch (error) {
        if (raiseGuardrailErrors) {
          // Re-raise the exception to stop execution
          throw error;
        } else {
          // When raiseGuardrailErrors=false, treat errors as safe and continue execution
          // Return tripwireTriggered=false to allow execution to continue
          return {
            outputInfo: {
              error: error instanceof Error ? error.message : String(error),
              guardrail_name: guardrail.name || 'unknown',
            },
            tripwireTriggered: false,
          };
        }
      }
    },
  }));
}
