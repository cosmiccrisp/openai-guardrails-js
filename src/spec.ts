/**
 * Guardrail specification and model resolution.
 * 
 * This module defines the `GuardrailSpec` class, which captures the metadata,
 * configuration schema, and logic for a guardrail. It also includes a structured
 * metadata model for attaching descriptive and extensible information to guardrails,
 * and instantiation logic for producing executable guardrail instances.
 */

import { z } from 'zod';
import { CheckFn, TContext, TIn, TCfg } from './types';
import { ConfiguredGuardrail } from './runtime';

/**
 * Structured metadata for a guardrail specification.
 * 
 * This interface provides an extensible, strongly-typed way to attach metadata to
 * guardrails for discovery, documentation, or engine-specific introspection.
 */
export interface GuardrailSpecMetadata {
    /** How the guardrail is implemented (regex/LLM/etc.) */
    engine?: string;
    /** Additional metadata fields */
    [key: string]: any;
}

/**
 * Immutable descriptor for a registered guardrail.
 * 
 * Encapsulates all static information about a guardrail, including its name,
 * human description, supported media type, configuration schema, the validation
 * function, context requirements, and optional metadata.
 * 
 * GuardrailSpec instances are registered for cataloguing and introspection,
 * but should be instantiated with user configuration to create a runnable guardrail
 * for actual use.
 */
export class GuardrailSpec<TContext = any, TIn = any, TCfg = any> {
    constructor(
        public readonly name: string,
        public readonly description: string,
        public readonly mediaType: string,
        public readonly configSchema: z.ZodType<TCfg>,
        public readonly checkFn: CheckFn<TContext, TIn, TCfg>,
        public readonly ctxRequirements: z.ZodType<TContext>,
        public readonly metadata?: GuardrailSpecMetadata
    ) { }

    /**
     * Return the JSON schema for the guardrail's configuration model.
     * 
     * This method provides the schema needed for UI validation, documentation,
     * or API introspection.
     * 
     * @returns JSON schema describing the config model fields.
     */
    schema(): Record<string, any> {
        return this.configSchema._def;
    }

    /**
     * Produce a configured, executable guardrail from this specification.
     * 
     * This is the main entry point for creating guardrail instances that can
     * be run in a validation pipeline. The returned object is fully bound to
     * this definition and the provided configuration.
     * 
     * @param config Validated configuration for this guardrail.
     * @returns Runnable guardrail instance.
     */
    instantiate(config: TCfg): ConfiguredGuardrail<TContext, TIn, TCfg> {
        return new ConfiguredGuardrail(this, config);
    }
} 