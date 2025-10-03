# Types: TypeScript

Below are the core types used by the `@guardrails/guardrails-ts` library.

## GuardrailLLMContext

```typescript
export interface GuardrailLLMContext {
  guardrailLlm: OpenAI;
}
```

Context interface providing access to the OpenAI client used by guardrails.

## GuardrailLLMContextWithHistory

```typescript
export interface GuardrailLLMContextWithHistory extends GuardrailLLMContext {
  getConversationHistory(): any[];
  getInjectionLastCheckedIndex(): number;
  updateInjectionLastCheckedIndex(index: number): void;
}
```

Extends the base context with helpers for conversation-history aware checks (e.g., prompt injection detection).

## GuardrailResult

```typescript
export interface GuardrailResult {
  tripwireTriggered: boolean;
  executionFailed?: boolean;
  originalException?: Error;
  info: {
    checked_text: string;
    [key: string]: any;
  };
}
```

Standard result returned by every guardrail check. The `executionFailed` field indicates if the guardrail itself failed to execute (e.g., invalid model name), and `originalException` contains the exception that caused the failure. These fields are used by the `raise_guardrail_errors` parameter to control error handling behavior.

## CheckFn

```typescript
export type CheckFn<TContext = object, TIn = unknown, TCfg = object> =
  (ctx: TContext, input: TIn, config: TCfg) => GuardrailResult | Promise<GuardrailResult>;
```

Callable signature implemented by all guardrails. May be sync or async.

## Utility Types

```typescript
export type MaybeAwaitableResult = GuardrailResult | Promise<GuardrailResult>;
export type TContext = object;
export type TIn = unknown;
export type TCfg = object;
```

For the full source, see [src/types.ts](https://github.com/openai/openai-guardrails-js/blob/main/src/types.ts) in the repository.


