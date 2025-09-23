/**
 * Configuration constants for contract analysis rules and limits
 */

export const ANALYZE_COOLDOWN_SECONDS = Number(Deno.env.get('ANALYZE_COOLDOWN_SECONDS') || 60);
export const MAX_ANALYZE_CHARS = Number(Deno.env.get('MAX_ANALYZE_CHARS') || 60000);