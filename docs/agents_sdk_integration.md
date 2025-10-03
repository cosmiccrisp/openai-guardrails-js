# Using Guardrails with Agents SDK

Our Guardrails can easily be integrated with OpenAI's Agents SDK using the **GuardrailAgent** class for a seamless drop-in replacement.

## Overview

**GuardrailAgent** provides the simplest integration - just replace `Agent` with `GuardrailAgent` and add your config:

- Drop-in replacement for Agents SDK's `Agent` class
- Automatically configures guardrails from your pipeline configuration 
- Returns a regular `Agent` instance that works with all Agents SDK features
- **Prompt Injection Detection runs at the tool level** - checks EACH tool call and output
- Other guardrails run at the agent level for efficiency
- Keep your existing pipeline configuration - no need to rewrite
- Use Agents SDK's native exception handling for guardrail violations

## Quick Start with GuardrailAgent

The easiest way to integrate guardrails is using `GuardrailAgent` as a drop-in replacement:

```typescript
import { GuardrailAgent } from '@openai/guardrails';
import { Runner } from '@openai/agents';

// Create agent with guardrails automatically configured
const agent = new GuardrailAgent({
  config: {
    version: 1,
    input: {
      version: 1,
      guardrails: [
        { name: 'Moderation', config: { categories: ['hate', 'violence'] } }
      ]
    },
    output: {
      version: 1,
      guardrails: [
        { name: 'Moderation', config: { categories: ['hate', 'violence'] } }
      ]
    }
  },
  name: "Customer support agent",
  instructions: "You are a customer support agent. You help customers with their questions."
});

async function main() {
  while (true) {
    try {
      const userInput = await prompt("Enter a message: ");
      const result = await Runner.run(agent, userInput);
      console.log(`Assistant: ${result.finalOutput}`);
    } catch (error) {
      if (error.constructor.name === 'InputGuardrailTripwireTriggered') {
        console.log("🛑 Input guardrail triggered!");
        continue;
      }
      if (error.constructor.name === 'OutputGuardrailTripwireTriggered') {
        console.log("🛑 Output guardrail triggered!");
        continue;
      }
      throw error;
    }
  }
}

main();
```

That's it! `GuardrailAgent` automatically:

- Parses your pipeline configuration
- Creates the appropriate guardrail functions 
- Wires them to a regular `Agent` instance
- Returns the configured agent ready for use with `Runner.run()`

## Configuration Options

GuardrailAgent supports the same configuration formats as our other clients:

```typescript
// Object configuration (recommended)
const agent = new GuardrailAgent({
  config: {
    version: 1,
    input: { version: 1, guardrails: [...] },
    output: { version: 1, guardrails: [...] }
  },
  // ... other agent options
});

// Dynamic configuration
const configDict = {
  version: 1,
  input: { version: 1, guardrails: [...] },
  output: { version: 1, guardrails: [...] }
};
const agent = new GuardrailAgent({ config: configDict, ... });
```

## Next Steps

- Use the [Guardrails Wizard](https://platform.openai.com/guardrails) to generate your configuration
- Explore available guardrails for your use case  
- Learn about pipeline configuration in our [quickstart](./quickstart.md)
- For more details on the OpenAI Agents SDK, refer to the [Agent SDK documentation](https://openai.github.io/openai-agents-js/).
