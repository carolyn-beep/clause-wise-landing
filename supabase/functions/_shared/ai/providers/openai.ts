import { getAIConfig } from '../../env-utils.ts';

/**
 * Contract analysis result structure
 */
export interface ContractAnalysisResult {
  summary: string;
  overall_risk: 'low' | 'medium' | 'high';
  flags: Array<{
    clause: string;
    severity: 'low' | 'medium' | 'high';
    rationale: string;
    suggestion: string;
  }>;
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw {
        code: 'AI_ERROR',
        message: `OpenAI API error: ${response.status} - ${response.statusText}`
      };
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw {
        code: 'AI_ERROR',
        message: 'Invalid response from OpenAI API'
      };
    }

    const content = data.choices[0].message.content;
    console.log('OpenAI response content length:', content?.length || 0);

    // Parse the JSON response
    let analysisResult: ContractAnalysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw content:', content);
      throw {
        code: 'AI_ERROR',
        message: 'Failed to parse AI response as valid JSON'
      };
    }

    // Validate the response structure
    if (!analysisResult.overall_risk || !analysisResult.summary || !Array.isArray(analysisResult.flags)) {
      console.error('Invalid analysis result structure:', analysisResult);
      throw {
        code: 'AI_ERROR',
        message: 'AI response missing required fields'
      };
    }

    // Validate enum values
    const validRiskLevels = ['low', 'medium', 'high'];
    if (!validRiskLevels.includes(analysisResult.overall_risk)) {
      throw {
        code: 'AI_ERROR',
        message: `Invalid overall_risk value: ${analysisResult.overall_risk}`
      };
    }

    // Validate flags
    for (const flag of analysisResult.flags) {
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

    console.log(`Analysis complete: ${analysisResult.flags.length} flags, overall risk: ${analysisResult.overall_risk}`);
    return analysisResult;

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