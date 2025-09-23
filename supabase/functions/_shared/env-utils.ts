/**
 * Edge Function utilities for safely reading environment variables
 * This file is only for use in Supabase Edge Functions (Deno runtime)
 */

/**
 * Safely read required environment variable, throw if missing
 */
export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get environment variable with default fallback
 */
export function getEnvWithDefault(key: string, defaultValue: string): string {
  return Deno.env.get(key) || defaultValue;
}

/**
 * AI configuration interface
 */
export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
}

/**
 * Get AI configuration from environment variables
 * Validates that required secrets are set
 */
export function getAIConfig(): AIConfig {
  const provider = getEnvWithDefault('AI_PROVIDER', 'openai');
  const apiKey = getRequiredEnv('OPENAI_API_KEY');
  const model = getEnvWithDefault('OPENAI_MODEL', 'gpt-5-2025-08-07');

  console.log(`AI Config: provider=${provider}, model=${model}`);
  
  return {
    provider,
    apiKey,
    model
  };
}

/**
 * Validate that all required environment variables are set
 * Call this early in your edge function to fail fast
 */
export function validateEnvironment(): void {
  try {
    getAIConfig();
    console.log('✅ Environment validation successful');
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    throw error;
  }
}