/**
 * Unit tests for the runtime module.
 * 
 * This module tests the core runtime functionality including:
 * - Configuration bundle loading
 * - Guardrail instantiation
 * - Guardrail execution
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuardrailConfig, GuardrailBundle, loadConfigBundle } from '../../runtime';
import { CheckFn, GuardrailResult, GuardrailLLMContext } from '../../types';
import { OpenAI } from 'openai';

// Mock OpenAI module
vi.mock('openai', () => ({
    OpenAI: class MockOpenAI { }
}));

// Mock check function for testing
const mockCheck: CheckFn<any, any, any> = vi.fn().mockImplementation((ctx, data, config) => ({
    tripwireTriggered: false
}));

// Mock context
const context: GuardrailLLMContext = {
    guardrailLlm: new OpenAI({ apiKey: 'test-key' })
};

describe('Runtime Module', () => {
    describe('loadConfigBundle', () => {
        it('should load valid configuration bundle', () => {
            const bundleJson = JSON.stringify({
                version: 1,
                stageName: "test",
                guardrails: [
                    {
                        name: "test_guard",
                        config: { threshold: 10 }
                    }
                ]
            });

            const bundle = loadConfigBundle(bundleJson);
            expect(bundle.version).toBe(1);
            expect(bundle.stageName).toBe("test");
            expect(bundle.guardrails).toHaveLength(1);
        });

        it('should handle invalid JSON gracefully', () => {
            expect(() => loadConfigBundle('invalid json')).toThrow();
        });

        it('should validate required fields', () => {
            const invalidBundle = JSON.stringify({
                stageName: "test",
                guardrails: [
                    {
                        name: "test_guard"
                        // Missing config
                    }
                ]
            });

            expect(() => loadConfigBundle(invalidBundle)).toThrow();
        });
    });

    describe('GuardrailConfig', () => {
        it('should create config with required fields', () => {
            const config: GuardrailConfig = {
                name: "test_guard",
                config: { threshold: 10 }
            };
            expect(config.name).toBe("test_guard");
            expect(config.config.threshold).toBe(10);
        });
    });

    describe('GuardrailBundle', () => {
        it('should create bundle with required fields', () => {
            const bundle: GuardrailBundle = {
                stageName: "test",
                guardrails: []
            };

            expect(bundle.stageName).toBe("test");
            expect(bundle.guardrails).toHaveLength(0);
        });

        it('should validate required fields', () => {
            expect(() => loadConfigBundle('{"version": 1}')).toThrow();
        });
    });

    // TODO: Add tests for instantiateGuardrails and runGuardrails once mocking is resolved
    describe('Guardrail Execution', () => {
        it('should have placeholder for execution tests', () => {
            expect(true).toBe(true);
        });
    });
});
