/**
 * Observability logging utilities for contract analysis
 * Provides structured logging with safe data filtering
 */

// Safe keys that are allowed in log data
const SAFE_KEYS = new Set([
  'user_id',
  'route', 
  'status',
  'duration_ms',
  'ai_provider',
  'ai_model',
  'ai_tokens_in',
  'ai_tokens_out', 
  'ai_latency_ms',
  'error_code',
  'file_mime',
  'file_size',
  'storage_path',
  'analysis_id',
  'contract_id',
  'req_id'
]);

/**
 * Generate a new request ID
 * @returns Random UUID string
 */
export function newReqId(): string {
  return crypto.randomUUID();
}

/**
 * Log an event with structured data
 * Automatically filters out unsafe keys and never logs raw contract text or secrets
 * 
 * @param event - Event name (e.g., "analysis_started", "upload_completed")
 * @param data - Optional data object with safe keys only
 */
export function logEvent(event: string, data?: Record<string, any>): void {
  const logData: Record<string, any> = {
    ts: new Date().toISOString(),
    event
  };

  // Filter data to only include safe keys
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (SAFE_KEYS.has(key)) {
        logData[key] = value;
      }
      // Silently drop unknown/unsafe keys
    }
  }

  console.log(JSON.stringify(logData));
}