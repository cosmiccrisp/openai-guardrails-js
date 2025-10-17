/**
 * Async run engine for guardrail evaluation.
 *
 * This module provides an asynchronous engine for running guardrail checks on evaluation samples.
 * It supports batch processing, error handling, and progress reporting for large-scale evaluation workflows.
 */

import { Context, RunEngine, Sample, SampleResult } from './types';
import { ConfiguredGuardrail, runGuardrails } from '../../runtime';

/**
 * Runs guardrail evaluations asynchronously.
 */
export class AsyncRunEngine implements RunEngine {
  private guardrailNames: string[];
  private guardrails: ConfiguredGuardrail[];

  constructor(guardrails: ConfiguredGuardrail[]) {
    this.guardrailNames = guardrails.map((g) => g.definition.name);
    this.guardrails = guardrails;
  }

  /**
   * Run evaluations on samples in batches.
   *
   * @param context - Evaluation context
   * @param samples - List of samples to evaluate
   * @param batchSize - Number of samples to process in parallel
   * @param desc - Description for the progress reporting
   * @returns List of evaluation results
   *
   * @throws {Error} If batchSize is less than 1
   */
  async run(
    context: Context,
    samples: Sample[],
    batchSize: number,
    desc: string = 'Evaluating samples'
  ): Promise<SampleResult[]> {
    if (batchSize < 1) {
      throw new Error('batchSize must be at least 1');
    }

    const results: SampleResult[] = [];
    let processed = 0;

    console.log(`${desc}: ${samples.length} samples, batch size: ${batchSize}`);

    for (let i = 0; i < samples.length; i += batchSize) {
      const batch = samples.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((sample) => this.evaluateSample(context, sample))
      );
      results.push(...batchResults);
      processed += batch.length;
      console.log(`Processed ${processed}/${samples.length} samples`);
    }

    return results;
  }

  /**
   * Evaluate a single sample against all guardrails.
   *
   * @param context - Evaluation context
   * @param sample - Sample to evaluate
   * @returns Evaluation result for the sample
   */
  private async evaluateSample(context: Context, sample: Sample): Promise<SampleResult> {
    try {
      // Use the actual guardrail configurations that were loaded
      const bundle = {
        guardrails: this.guardrails.map((g) => ({
          name: g.definition.name,
          config: g.config,
        })),
      };

      const results = await runGuardrails(sample.data, bundle, context);

      const triggered: Record<string, boolean> = {};
      const details: Record<string, unknown> = {};

      // Initialize all guardrails as not triggered
      for (const name of this.guardrailNames) {
        triggered[name] = false;
      }

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const name = this.guardrailNames[i] || 'unknown';
        triggered[name] = result.tripwireTriggered;
        if (result.info) {
          details[name] = result.info;
        }
      }

      return {
        id: sample.id,
        expectedTriggers: sample.expectedTriggers,
        triggered,
        details,
      };
    } catch (error) {
      console.error(`Error evaluating sample ${sample.id}:`, error);

      const triggered: Record<string, boolean> = {};
      for (const name of this.guardrailNames) {
        triggered[name] = false;
      }

      return {
        id: sample.id,
        expectedTriggers: sample.expectedTriggers,
        triggered,
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}
