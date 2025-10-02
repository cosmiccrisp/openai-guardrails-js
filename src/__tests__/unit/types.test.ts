/**
 * Unit tests for the types module.
 * 
 * This module tests the core type definitions including:
 * - GuardrailResult structure and immutability
 * - CheckFn function signatures
 * - Context interfaces
 * - Type compatibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GuardrailResult, CheckFn, GuardrailLLMContext } from '../../types';

describe('Types Module', () => {
    describe('GuardrailResult', () => {
        it('should create result with required fields', () => {
            const result: GuardrailResult = {
                tripwireTriggered: true,
                info: {
                    checked_text: "test"
                }
            };
            expect(result.tripwireTriggered).toBe(true);
            expect(result.info.checked_text).toBe("test");
        });

        it('should create result with custom info', () => {
            const info = { reason: 'test', severity: 'high' };
            const result: GuardrailResult = {
                tripwireTriggered: false,
                info: {
                    checked_text: "test",
                    ...info
                }
            };
            expect(result.tripwireTriggered).toBe(false);
            expect(result.info.checked_text).toBe("test");
            expect(result.info.reason).toBe('test');
            expect(result.info.severity).toBe('high');
        });

        it('should handle minimal info', () => {
            const result: GuardrailResult = {
                tripwireTriggered: true,
                info: {
                    checked_text: "test"
                }
            };
            expect(result.tripwireTriggered).toBe(true);
            expect(result.info.checked_text).toBe("test");
        });
    });

    describe('CheckFn', () => {
        it('should work with sync function', () => {
            const syncCheck = (ctx: any, data: any, config: any): GuardrailResult => ({
                tripwireTriggered: data === 'trigger',
                info: {
                    checked_text: data
                }
            });

            const result = syncCheck({}, 'trigger', {});
            expect(result.tripwireTriggered).toBe(true);
        });

        it('should work with async function', async () => {
            const asyncCheck = async (ctx: any, data: any, config: any): Promise<GuardrailResult> => ({
                tripwireTriggered: data === 'trigger',
                info: {
                    checked_text: data
                }
            });

            const result = await asyncCheck({}, 'trigger', {});
            expect(result.tripwireTriggered).toBe(true);
        });
    });

    describe('GuardrailLLMContext', () => {
        it('should require guardrailLlm property', () => {
            const context: GuardrailLLMContext = {
                guardrailLlm: {} as any
            };

            expect(context.guardrailLlm).toBeDefined();
        });

        it('should work with mock LLM client', () => {
            // Test that the interface can be implemented with any object that has guardrailLlm
            const mockLLM = { someMethod: () => 'test' };

            const context: GuardrailLLMContext = {
                guardrailLlm: mockLLM as any
            };

            expect(context.guardrailLlm).toBeDefined();
            expect((context.guardrailLlm as any).someMethod()).toBe('test');
        });
    });

    describe('Type compatibility', () => {
        it('should allow flexible context types', () => {
            const check = (ctx: { user: string }, data: string, config: { threshold: number }): GuardrailResult => ({
                tripwireTriggered: data.length > config.threshold,
                info: {
                    checked_text: data
                }
            });

            const result = check({ user: 'test' }, 'hello', { threshold: 3 });
            expect(result.tripwireTriggered).toBe(true);
        });

        it('should allow flexible input types', () => {
            const check = (ctx: any, data: any, config: any): GuardrailResult => ({
                tripwireTriggered: false,
                info: {
                    checked_text: data
                }
            });

            const result = check({}, 'string input', {});
            expect(result.tripwireTriggered).toBe(false);
        });

        it('should allow flexible config types', () => {
            const check = (ctx: any, data: any, config: any): GuardrailResult => ({
                tripwireTriggered: false,
                info: {
                    checked_text: data
                }
            });

            const result = check({}, 'input', { complex: { nested: 'config' } });
            expect(result.tripwireTriggered).toBe(false);
        });
    });
});
