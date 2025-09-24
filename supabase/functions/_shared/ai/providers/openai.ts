import { getAIConfig } from '../../env-utils.ts';

type Severity = 'low' | 'medium' | 'high';
type AIFlag = { clause: string; severity: Severity; rationale: string; suggestion: string };

/**
 * Contract analysis result structure with telemetry
 */
export interface ContractAnalysisResult {
  summary: string;
  overall_risk: Severity;
  flags: AIFlag[];
  meta?: {
    provider: 'openai';
    model?: string | null;
    tokens_in?: number | null;
    tokens_out?: number | null;
    latency_ms?: number | null;
    raw?: any;
  };
}

// Re-export for compatibility
export type AIResult = ContractAnalysisResult;
export { type AIFlag };

const REQUIRED_PROVIDER = 'openai';

const CLAUSEWISE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_risk: { enum: ['low', 'medium', 'high'] },
    summary: { type: 'string', minLength: 1, maxLength: 600 },
    flags: {
      type: 'array',
      maxItems: 40,
      items: {
        type: 'object',
        properties: {
          clause: { type: 'string', minLength: 1, maxLength: 600 },
          severity: { enum: ['low', 'medium', 'high'] },
          rationale: { type: 'string', minLength: 1, maxLength: 400 },
          suggestion: { type: 'string', minLength: 1, maxLength: 400 }
        },
        required: ['clause', 'severity', 'rationale', 'suggestion'],
        additionalProperties: false
      }
    }
  },
  required: ['overall_risk', 'summary', 'flags'],
  additionalProperties: false
} as const;

const SYSTEM_PROMPT = `
You are an expert contract analyst focused on protecting freelancers.
Return STRICT JSON only, matching the provided JSON schema exactly.
Style: concise, practical, no fluff. No disclaimers of any kind in JSON.
If the text appears boilerplate/incomplete, say so briefly in "summary".
` as const;

function buildUserPrompt(text: string, truncated: boolean) {
  return [
    `Analyze the following contract text for freelancer-relevant risks.`,
    `Identify clauses and produce flags with severity, brief rationale, and a practical suggestion.`,
    `Do not include any text outside JSON.`,
    truncated
      ? `NOTE: The input was truncated for length. If needed, reflect this at the end of "summary".`
      : ``,
    `--- CONTRACT TEXT START ---\n${text}\n--- CONTRACT TEXT END ---`
  ]
    .filter(Boolean)
    .join('\n');
}

// Try to extract JSON string from multiple possible OpenAI response shapes
function extractJsonString(raw: any): string | null {
  // Responses API (typical)
  const r1 = raw?.output?.[0]?.content?.[0]?.text;
  if (r1 && typeof r1 === 'string') return r1;

  // Some Responses API SDKs expose output_text
  const r2 = raw?.output_text;
  if (r2 && typeof r2 === 'string') return r2;

  // Chat Completions
  const r3 = raw?.choices?.[0]?.message?.content;
  if (r3 && typeof r3 === 'string') return r3;

  // Fallback: find first {...} block
  const texty =
    raw?.message ??
    raw?.content ??
    raw?.choices?.[0]?.text ??
    (typeof raw === 'string' ? raw : '');
  if (typeof texty === 'string') {
    const m = texty.match(/\{[\s\S]*\}$/m);
    if (m) return m[0];
  }
  return null;
}

// Minimal structural check (avoid extra deps)
function looksLikeSchema(o: any): o is Omit<ContractAnalysisResult, 'meta'> {
  return (
    o &&
    (o.overall_risk === 'low' || o.overall_risk === 'medium' || o.overall_risk === 'high') &&
    typeof o.summary === 'string' &&
    Array.isArray(o.flags) &&
    o.flags.every(
      (f: any) =>
        f &&
        typeof f.clause === 'string' &&
        (f.severity === 'low' || f.severity === 'medium' || f.severity === 'high') &&
        typeof f.rationale === 'string' &&
        typeof f.suggestion === 'string'
    )
  );
}

async function callOpenAIJSON({
  apiKey,
  model,
  system,
  user
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  // Determine which API to use based on model family
  // Newer models (gpt-5, o3, o4*) use the Responses API and do not support temperature/max_tokens
  const isResponses = /^(gpt-5|o3|o4)/i.test(model);
  const endpoint = isResponses
    ? 'https://api.openai.com/v1/responses'
    : 'https://api.openai.com/v1/chat/completions';

  const body = isResponses
    ? {
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        // Strict JSON schema for structured output
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'ClauseWiseAnalysis', schema: CLAUSEWISE_JSON_SCHEMA, strict: true }
        },
        // Use the correct token parameter for newer models
        max_completion_tokens: 1024
      }
    : {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        // Legacy chat completions supports temperature and max_tokens
        temperature: 0.2,
        max_tokens: 1024,
        // Ask for JSON object to improve well-formedness
        response_format: { type: 'json_object' }
      };

  const t0 = Date.now();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const raw = await res.json().catch(() => ({}));
  const latency_ms = Date.now() - t0;
  if (!res.ok) {
    const msg = raw?.error?.message || `OpenAI HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.code = 'AI_ERROR';
    err.raw = raw;
    throw err;
  }

  const jsonText = extractJsonString(raw);
  if (!jsonText) {
    const err: any = new Error('No JSON found in model output');
    err.code = 'AI_BAD_OUTPUT';
    err.raw = raw;
    throw err;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const err: any = new Error('Invalid JSON in model output');
    err.code = 'AI_BAD_JSON';
    err.raw = raw;
    throw err;
  }

  const meta = {
    provider: 'openai' as const,
    model: raw?.model ?? model ?? null,
    tokens_in: raw?.usage?.input_tokens ?? raw?.usage?.prompt_tokens ?? null,
    tokens_out: raw?.usage?.output_tokens ?? raw?.usage?.completion_tokens ?? null,
    latency_ms,
    raw
  };

  return { parsed, meta };
}

export async function analyzeWithOpenAI({ text }: { text: string }): Promise<ContractAnalysisResult> {
  if ((Deno.env.get('AI_PROVIDER') || REQUIRED_PROVIDER).toLowerCase() !== REQUIRED_PROVIDER) {
    const err: any = new Error('AI provider not supported');
    err.code = 'AI_ERROR';
    throw err;
  }

  // Read AI config and sanitize model
  const { apiKey, model: cfgModel } = getAIConfig();
  let model = cfgModel;
  // Guard against misconfigured secrets where OPENAI_MODEL is set to an API key
  if (!model || model.toLowerCase().startsWith('sk-')) {
    console.warn('Invalid OPENAI_MODEL detected, falling back to gpt-4o-mini');
    model = 'gpt-4o-mini';
  }

  // Truncate to keep context bounded
  const MAX = 60_000;
  const truncated = text.length > MAX;
  const inputText = truncated ? text.slice(0, MAX) : text;

  const system = SYSTEM_PROMPT;
  const user = buildUserPrompt(inputText, truncated);

  // Helper to run a full attempt (with JSON retry) for a given model
  const runAttempt = async (mdl: string): Promise<ContractAnalysisResult> => {
    let first: any;
    try {
      first = await callOpenAIJSON({ apiKey, model: mdl, system, user });
    } catch (e: any) {
      // Bubble up to caller to decide fallback
      throw e;
    }

    if (!looksLikeSchema(first.parsed)) {
      const retryUser =
        user +
        `\n\nIf your previous message contained anything other than JSON or did not match the schema, REPRINT JSON-ONLY that strictly conforms to the schema.`;
      const second = await callOpenAIJSON({ apiKey, model: mdl, system, user: retryUser });
      if (!looksLikeSchema(second.parsed)) {
        const err: any = new Error('Model output does not match schema after retry');
        err.code = 'AI_BAD_OUTPUT';
        err.raw = second.meta?.raw ?? first.meta?.raw;
        throw err;
      }
      const res: ContractAnalysisResult = { ...second.parsed, meta: second.meta };
      if (truncated) res.summary = res.summary.trim() + ' (Note: analysis ran on a truncated excerpt.)';
      return res;
    }

    const res: ContractAnalysisResult = { ...first.parsed, meta: first.meta };
    if (truncated) res.summary = res.summary.trim() + ' (Note: analysis ran on a truncated excerpt.)';
    return res;
  };

  // Primary attempt with configured model; on error, try fallbacks automatically
  try {
    return await runAttempt(model);
  } catch (primaryErr: any) {
    console.warn(`Primary model '${model}' failed: ${primaryErr?.message || primaryErr}. Trying fallbacks...`);
    const fallbacks = ['gpt-4o-mini', 'gpt-4.1-2025-04-14'];
    for (const fb of fallbacks) {
      try {
        return await runAttempt(fb);
      } catch (e) {
        console.warn(`Fallback model '${fb}' failed: ${(e as any)?.message || e}`);
      }
    }
    // If all fail, rethrow original
    throw primaryErr;
  }
}
