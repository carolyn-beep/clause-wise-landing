import { getRequiredEnv, getEnvWithDefault } from '../env-utils.ts';

/**
 * Error interface for content moderation failures
 */
export interface ModerationError extends Error {
  code: string;
  categories: string[];
}

/**
 * OpenAI Moderation API response structure
 */
interface ModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
}

/**
 * Ensure input text is safe for AI processing using OpenAI's moderation API
 * Throws ModerationError if content is flagged, allows through on API failures
 */
export async function ensureSafeInput(text: string): Promise<void> {
  // Only run moderation for OpenAI provider
  const provider = getEnvWithDefault('AI_PROVIDER', 'openai').toLowerCase();
  if (provider !== 'openai') {
    return; // Allow through for non-OpenAI providers
  }

  // Cap the text sample sent to moderation API
  const sample = text.slice(0, 20_000);
  
  try {
    const apiKey = getRequiredEnv('OPENAI_API_KEY');
    let response: Response;
    let moderationResult: ModerationResponse;

    // Try with omni-moderation-latest first
    try {
      console.log('Running content moderation check...');
      response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: sample,
          model: 'omni-moderation-latest'
        }),
      });

      if (!response.ok) {
        throw new Error(`Moderation API error: ${response.status}`);
      }

      moderationResult = await response.json();
    } catch (omniError) {
      // Retry with text-moderation-latest
      console.log('Retrying moderation with fallback model...');
      response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: sample,
          model: 'text-moderation-latest'
        }),
      });

      if (!response.ok) {
        throw new Error(`Moderation API error: ${response.status}`);
      }

      moderationResult = await response.json();
    }

    // Check if content is flagged
    if (moderationResult.results && moderationResult.results.length > 0) {
      const result = moderationResult.results[0];
      
      if (result.flagged) {
        // Collect flagged categories
        const flaggedCategories: string[] = [];
        for (const [category, isFlagged] of Object.entries(result.categories)) {
          if (isFlagged) {
            flaggedCategories.push(category);
          }
        }

        console.log(`Content blocked by moderation. Categories: ${flaggedCategories.join(', ')}`);
        
        // Create and throw moderation error
        const error = new Error('Content blocked by moderation') as ModerationError;
        error.code = 'CONTENT_BLOCKED';
        error.categories = flaggedCategories;
        throw error;
      }
    }

    console.log('Content passed moderation check');

  } catch (error) {
    // Re-throw moderation errors (content blocked)
    if ((error as ModerationError).code === 'CONTENT_BLOCKED') {
      throw error;
    }

    // For network/API errors, log error but allow content through (fail open)
    console.error('Moderation failed - allowing content through:', error.message);
    // Intentionally do NOT log the actual text content for privacy
    return;
  }
}

/**
 * Format a user-friendly message for blocked content
 */
export function formatModerationMessage(categories: string[]): string {
  return `We can't analyze this text because it triggers safety filters (categories: ${categories.join(', ')}). Please remove sensitive content and try again.`;
}