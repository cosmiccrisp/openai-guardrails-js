# Guardrails TypeScript

A TypeScript framework for building safe and reliable AI systems with OpenAI Guardrails. This package provides enhanced type safety and Node.js integration for AI safety and reliability.

## Installation

### Local Development
Clone the repository and install locally:

```bash
# Clone the repository
git clone https://github.com/openai/guardrails-js.git
cd guardrails-js

# Install dependencies
npm install

# Build the package
npm run build
```

## Quick Start

### Drop-in OpenAI Replacement
The easiest way to use Guardrails TypeScript is as a drop-in replacement for the OpenAI client:

```typescript
import { GuardrailsOpenAI } from '@guardrails/guardrails-ts';

async function main() {
    // Use GuardrailsOpenAI instead of OpenAI
    const client = await GuardrailsOpenAI.create({
        version: 1,
        output: {
            version: 1,
            guardrails: [
                {"name": "Moderation", "config": {"categories": ["hate", "violence"]}}
            ]
        }
    });
    
    try {
        const response = await client.responses.create({
            model: "gpt-5",
            input: "Hello world"
        });
        
        // Access OpenAI response via .llm_response
        console.log(response.llm_response.output_text);
        
    } catch (error) {
        if (error.constructor.name === 'GuardrailTripwireTriggered') {
            console.log(`Guardrail triggered: ${error.guardrailResult.info}`);
        }
    }
}

main();
```

### Agents SDK Integration
```typescript
import { GuardrailAgent } from '@guardrails/guardrails-ts';
import { Runner } from '@openai/agents';

// Create agent with guardrails automatically configured
const agent = new GuardrailAgent({
    config: {
        version: 1,
        output: {
            version: 1,
            guardrails: [
                {"name": "Moderation", "config": {"categories": ["hate", "violence"]}}
            ]
        }
    },
    name: "Customer support agent",
    instructions: "You are a helpful customer support agent."
});

// Use exactly like a regular Agent
const result = await Runner.run(agent, "Hello, can you help me?");
```

## Evaluation Framework

The evaluation framework allows you to test guardrail performance on datasets and measure metrics like precision, recall, and F1 scores.

### Running Evaluations

**Using the CLI:**
```bash
npm run build
npm run eval -- --config-path src/evals/sample_eval_data/nsfw_config.json --dataset-path src/evals/sample_eval_data/nsfw_eval.jsonl
```


### Dataset Format

Datasets must be in JSONL format, with each line containing a JSON object:

```json
{
  "id": "sample_1",
  "data": "Text to evaluate",
  "expectedTriggers": {
    "guardrail_name_1": true,
    "guardrail_name_2": false
  }
}
```

### Programmatic Usage

```typescript
import { GuardrailEval } from '@guardrails/guardrails-ts';

const eval = new GuardrailEval(
    'configs/my_guardrails.json',
    'data/demo_data.jsonl',
    32,  // batch size
    'results'  // output directory
);

await eval.run('Evaluating my dataset');
```

### Project Structure
- `src/` - TypeScript source code
- `dist/` - Compiled JavaScript output
- `src/checks/` - Built-in guardrail checks
- `src/evals/` - Evaluation framework
- `src/examples/` - Example usage and sample data

## Examples

The package includes comprehensive examples in the `examples/` directory:

- **`agents_sdk.ts`**: Agents SDK integration with GuardrailAgent
- **`hello_world.ts`**: Basic chatbot with guardrails using GuardrailsOpenAI
- **`azure_example.ts`**: Azure OpenAI integration example
- **`local_model.ts`**: Using local models with guardrails
- **`streaming.ts`**: Streaming responses with guardrails
- **`suppress_tripwire.ts`**: Handling guardrail violations gracefully

### Running Examples

#### Prerequisites
Before running examples, you need to build the package:

```bash
# Install dependencies (if not already done)
npm install

# Build the TypeScript code
npm run build
```

#### Running Individual Examples

**Using tsx (Recommended)**
```bash
cd examples
npx tsx agents_sdk.ts                    # Agents SDK integration
npx tsx hello_world.ts                   # Basic chatbot with guardrails
npx tsx azure_example.ts                 # Azure OpenAI integration
npx tsx local_model.ts                   # Local model usage
npx tsx streaming.ts                     # Streaming responses
npx tsx suppress_tripwire.ts             # Handling violations
```

## Available Guardrails

The TypeScript implementation includes the following built-in guardrails:

- **Keywords**: Filters content based on keyword matching
- **Moderation**: Content moderation using OpenAI's moderation API
- **URLs**: URL filtering and domain allowlist/blocklist
- **PII**: Personally Identifiable Information detection
- **NSFW**: Not Safe For Work content detection
- **Hallucination Detection**: Detects hallucinated content using vector stores
- **Jailbreak**: Detects jailbreak attempts
- **Competitors**: Detects mentions of competitor products
- **Secret Keys**: Detects exposed API keys and secrets
- **Topical Alignment**: Ensures responses stay within business scope
- **User-Defined LLM**: Custom LLM-based guardrails

## License

MIT License - see LICENSE file for details.

## Disclaimers

Please note that Guardrails may use Third-Party Services such as the [Presidio open-source framework](https://github.com/microsoft/presidio), which are subject to their own terms and conditions and are not developed or verified by OpenAI.

Developers are responsible for implementing appropriate safeguards to prevent storage or misuse of sensitive or prohibited content (including but not limited to personal data, child sexual abuse material, or other illegal content). OpenAI disclaims liability for any logging or retention of such content by developers. Developers must ensure their systems comply with all applicable data protection and content safety laws, and should avoid persisting any blocked content generated or intercepted by Guardrails.