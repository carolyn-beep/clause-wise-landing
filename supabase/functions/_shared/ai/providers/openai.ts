import { getAIConfig } from '../../env-utils.ts';

/**
 * Contract analysis flag structure
 */
export interface AIFlag {
  clause: string;
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  suggestion: string;
}

/**
 * Contract analysis result structure with telemetry
 */
export interface ContractAnalysisResult {
  summary: string;
  overall_risk: 'low' | 'medium' | 'high';
  flags: AIFlag[];
  meta?: {
    provider: 'openai';
    model?: string | null;
    tokens_in?: number | null;
    tokens_out?: number | null;
    latency_ms?: number | null;
    raw?: any; // keep undefined in production if you prefer
  };
}

/**
 * JSON Schema for OpenAI structured output
 */
const ANALYSIS_SCHEMA = {
  "type": "object",
  "properties": {
    "overall_risk": {
      "enum": ["low", "medium", "high"]
    },
    "summary": {
      "type": "string",
      "minLength": 1,
      "maxLength": 600
    },
    "flags": {
      "type": "array",
      "maxItems": 40,
      "items": {
        "type": "object",
        "properties": {
          "clause": {
            "type": "string",
            "minLength": 1,
            "maxLength": 600
          },
          "severity": {
            "enum": ["low", "medium", "high"]
          },
          "rationale": {
            "type": "string",
            "minLength": 1,
            "maxLength": 400
          },
          "suggestion": {
            "type": "string",
            "minLength": 1,
            "maxLength": 400
          }
        },
        "required": ["clause", "severity", "rationale", "suggestion"],
        "additionalProperties": false
      }
    }
  },
  "required": ["overall_risk", "summary", "flags"],
  "additionalProperties": false
};

/**
 * System prompt for contract analysis
 */
const SYSTEM_PROMPT = `You are an expert contract analyst for freelancers. Output STRICT JSON matching the schema. Be concise and practical.

Focus on identifying clauses that could be problematic for freelancers, such as:
- Unfair payment terms or conditions
- IP ownership issues
- Excessive liability or indemnification
- Non-compete restrictions
- Termination clauses
- Auto-renewal terms
- Limitation of liability favoring only one party
- Vague scope of work definitions
- Unreasonable warranty disclaimers

For each flag:
- Extract the specific problematic clause text
- Assess severity: low (minor concern), medium (should negotiate), high (major red flag)
- Explain why it's problematic in plain language
- Suggest specific improvements or alternatives

Keep your summary under 600 characters and focus on the overall contract fairness and risk level.`;

/**
 * Analyze contract text using OpenAI
 */
export async function analyzeWithOpenAI({ text }: { text: string }): Promise<ContractAnalysisResult> {
  const config = getAIConfig();
  
  // Validate provider
  if (config.provider !== 'openai') {
    throw {
      code: 'AI_ERROR',
      message: `Expected AI_PROVIDER to be 'openai', got '${config.provider}'`
    };
  }

  // Truncate text if too long
  let processedText = text.trim();
  if (processedText.length > 60000) {
    processedText = processedText.substring(0, 60000) + '\n\n[Note: Contract text was truncated for length]';
    console.log(`Contract text truncated from ${text.length} to ${processedText.length} characters`);
  }

  console.log(`Analyzing contract with OpenAI model: ${config.model}`);
  console.log(`Text length: ${processedText.length} characters`);

  const t0 = Date.now(); // Start timing

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Please analyze this contract text and identify potential issues for a freelancer:\n\n${processedText}`
          }
        ],
        // Use appropriate parameters based on model
        ...(config.model.startsWith('gpt-5') || config.model.startsWith('o3') || config.model.startsWith('o4') || config.model.startsWith('gpt-4.1') 
          ? { max_completion_tokens: 4000 } 
          : { max_tokens: 4000, temperature: 0.3 }
        ),
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contract_analysis",
            strict: true,
            schema: ANALYSIS_SCHEMA
          }
        }
      }),
    });

    const latency_ms = Date.now() - t0; // Calculate latency

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw {
        code: 'AI_ERROR',
        message: `OpenAI API error: ${response.status} - ${response.statusText}`
      };
    }

    const raw = await response.json(); // Keep full raw response
    
    if (!raw.choices || !raw.choices[0] || !raw.choices[0].message) {
      console.error('Invalid OpenAI response structure:', raw);
      throw {
        code: 'AI_ERROR',
        message: 'Invalid response from OpenAI API'
      };
    }

    const content = raw.choices[0].message.content;
    console.log('OpenAI response content length:', content?.length || 0);

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      throw {
        code: 'AI_ERROR',
        message: 'Failed to parse AI response as valid JSON'
      };
    }

    // Validate the response structure
    if (!parsed.overall_risk || !parsed.summary || !Array.isArray(parsed.flags)) {
      console.error('Invalid analysis result structure:', parsed);
      throw {
        code: 'AI_ERROR',
        message: 'AI response missing required fields'
      };
    }

    // Validate enum values
    const validRiskLevels = ['low', 'medium', 'high'];
    if (!validRiskLevels.includes(parsed.overall_risk)) {
      throw {
        code: 'AI_ERROR',
        message: `Invalid overall_risk value: ${parsed.overall_risk}`
      };
    }

    // Validate flags
    for (const flag of parsed.flags) {
      if (!flag.clause || !flag.severity || !flag.rationale || !flag.suggestion) {
        throw {
          code: 'AI_ERROR',
          message: 'Flag missing required fields'
        };
      }
      if (!validRiskLevels.includes(flag.severity)) {
        throw {
          code: 'AI_ERROR',
          message: `Invalid flag severity: ${flag.severity}`
        };
      }
    }

    // Extract telemetry metadata
    const model = raw?.model ?? config.model ?? null;
    const tokens_in = raw?.usage?.prompt_tokens ?? raw?.usage?.input_tokens ?? null;
    const tokens_out = raw?.usage?.completion_tokens ?? raw?.usage?.output_tokens ?? null;

    console.log(`Analysis complete: ${parsed.flags.length} flags, overall risk: ${parsed.overall_risk}`);
    console.log(`Telemetry: model=${model}, tokens_in=${tokens_in}, tokens_out=${tokens_out}, latency=${latency_ms}ms`);

    // Return result with telemetry metadata
    return {
      ...parsed,
      meta: {
        provider: 'openai',
        model,
        tokens_in,
        tokens_out,
        latency_ms,
        raw // Consider omitting in production for privacy/size
      }
    } as ContractAnalysisResult;

  } catch (error) {
    // Re-throw our custom errors
    if (error.code === 'AI_ERROR') {
      throw error;
    }

    // Handle network and other errors
    console.error('Unexpected error during OpenAI analysis:', error);
    throw {
      code: 'AI_ERROR',
      message: `Analysis failed: ${error.message || 'Unknown error'}`
    };
  }
}