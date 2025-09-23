import { analyzeWithOpenAI, type ContractAnalysisResult } from "./providers/openai.ts";

/**
 * Common interface for AI analysis providers
 */
export interface AIAnalyzer {
  analyze(input: { text: string }): Promise<ContractAnalysisResult>;
}

/**
 * OpenAI adapter implementation
 */
const openaiAnalyzer: AIAnalyzer = {
  async analyze({ text }) {
    return analyzeWithOpenAI({ text });
  }
};

/**
 * Factory function to get the appropriate AI analyzer based on configuration
 */
export function getAnalyzer(): AIAnalyzer {
  const provider = (Deno.env.get('AI_PROVIDER') || 'openai').toLowerCase();
  
  switch (provider) {
    case 'openai':
      return openaiAnalyzer;
    default:
      console.warn(`Unknown AI provider: ${provider}, falling back to OpenAI`);
      return openaiAnalyzer; // fallback
  }
}

/**
 * Convenience helper for running AI analysis
 */
export async function runAIAnalysis(text: string) {
  const analyzer = getAnalyzer();
  return analyzer.analyze({ text });
}

export { type ContractAnalysisResult, type AIFlag } from './providers/openai.ts';