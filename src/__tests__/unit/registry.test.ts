/**
 * Unit tests for the registry module.
 * 
 * This module tests the guardrail registry functionality including:
 * - Registration and retrieval
 * - Enumeration and metadata
 * - Configuration schemas
 * - Context requirements
 * - Overwriting behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuardrailRegistry } from '../../registry';
import { GuardrailSpec, GuardrailSpecMetadata } from '../../spec';
import { CheckFn, GuardrailResult } from '../../types';

// Mock check function for testing
const mockCheck: CheckFn<any, any, any> = vi.fn().mockImplementation((ctx, data, config) => ({
    tripwireTriggered: false
}));

describe('Registry Module', () => {
    let registry: GuardrailRegistry;

    beforeEach(() => {
        registry = new GuardrailRegistry();
        vi.clearAllMocks();
    });

    describe('GuardrailRegistry', () => {
        it('should register and retrieve guardrails', () => {
            registry.register(
                "test_guard",
                mockCheck,
                "Test guardrail",
                "text/plain"
            );

            const spec = registry.get("test_guard");
            expect(spec).toBeDefined();
            expect(spec?.name).toBe("test_guard");
            expect(spec?.description).toBe("Test guardrail");
        });

        it('should return undefined for non-existent guardrails', () => {
            const spec = registry.get("non_existent");
            expect(spec).toBeUndefined();
        });

        it('should enumerate all registered guardrails', () => {
            registry.register(
                "guard1",
                mockCheck,
                "First guard",
                "text/plain"
            );

            registry.register(
                "guard2",
                mockCheck,
                "Second guard",
                "text/plain"
            );

            const specs = registry.all();
            expect(specs).toHaveLength(2);
            expect(specs.map((s: any) => s.name)).toContain("guard1");
            expect(specs.map((s: any) => s.name)).toContain("guard2");
        });

        it('should handle guardrail with metadata', () => {
            const metadata: GuardrailSpecMetadata = {
                engine: "typescript",
                version: "1.0.0"
            };

            registry.register(
                "metadata_guard",
                mockCheck,
                "Guard with metadata",
                "text/plain",
                undefined,
                undefined,
                metadata
            );

            const spec = registry.get("metadata_guard");
            expect(spec?.metadata?.engine).toBe("typescript");
            expect(spec?.metadata?.version).toBe("1.0.0");
        });

        it('should handle guardrail with config schema', () => {
            const configSchema = {
                type: "object",
                properties: {
                    threshold: { type: "number" }
                }
            };

            registry.register(
                "schema_guard",
                mockCheck,
                "Guard with schema",
                "text/plain",
                configSchema as any
            );

            const spec = registry.get("schema_guard");
            expect(spec?.configSchema).toEqual(configSchema);
        });

        it('should handle guardrail with context requirements', () => {
            const contextRequirements = {
                type: "object",
                properties: {
                    user: { type: "string" }
                }
            };

            registry.register(
                "context_guard",
                mockCheck,
                "Guard with context",
                "text/plain",
                undefined,
                contextRequirements as any
            );

            const spec = registry.get("context_guard");
            expect(spec?.ctxRequirements).toEqual(contextRequirements);
        });

        it('should allow overwriting existing guardrails', () => {
            registry.register(
                "overwrite_test",
                mockCheck,
                "First version",
                "text/plain"
            );

            registry.register(
                "overwrite_test",
                mockCheck,
                "Second version",
                "text/plain"
            );

            const spec = registry.get("overwrite_test");
            expect(spec?.description).toBe("Second version");
        });

        it('should handle empty registry', () => {
            const specs = registry.all();
            expect(specs).toHaveLength(0);
        });

        it('should handle registry with single guardrail', () => {
            registry.register(
                "single_guard",
                mockCheck,
                "Single guard",
                "text/plain"
            );

            const specs = registry.all();
            expect(specs).toHaveLength(1);
            expect(specs[0].name).toBe("single_guard");
        });
    });

    describe('GuardrailSpec', () => {
        it('should create spec with all properties', () => {
            const metadata: GuardrailSpecMetadata = {
                engine: "typescript"
            };

            const spec = new GuardrailSpec(
                "full_spec",
                "Full specification",
                "text/plain",
                { type: "object" } as any,
                mockCheck,
                { type: "object" } as any,
                metadata
            );

            expect(spec.name).toBe("full_spec");
            expect(spec.description).toBe("Full specification");
            expect(spec.mediaType).toBe("text/plain");
            expect(spec.checkFn).toBe(mockCheck);
            expect(spec.metadata).toBe(metadata);
        });

        it('should instantiate guardrail from spec', () => {
            const spec = new GuardrailSpec(
                "test_spec",
                "Test specification",
                "text/plain",
                { type: "object" } as any,
                mockCheck,
                { type: "object" } as any
            );

            const guardrail = spec.instantiate({ threshold: 5 });
            expect(guardrail.definition).toBe(spec);
            expect(guardrail.config).toEqual({ threshold: 5 });
        });

        it('should run instantiated guardrail', async () => {
            const spec = new GuardrailSpec(
                "test_spec",
                "Test specification",
                "text/plain",
                { type: "object" } as any,
                mockCheck,
                { type: "object" } as any
            );

            const guardrail = spec.instantiate({ threshold: 5 });
            const result = await guardrail.run({}, "Hello world");

            expect(result.tripwireTriggered).toBe(false);
            expect(mockCheck).toHaveBeenCalledWith({}, "Hello world", { threshold: 5 });
        });
    });
});
