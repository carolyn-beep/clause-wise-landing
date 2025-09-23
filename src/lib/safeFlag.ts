export type Flag = {
  clause?: string
  severity?: 'low'|'medium'|'high'
  rationale?: string
  suggestion?: string
  span_start?: number|null
  span_end?: number|null
  context?: string|null
  keywords?: string[]|null
}

// Normalize a flag coming from DB/API so UI never crashes
export function normalizeFlag(f: Flag) {
  return {
    clause: f?.clause ?? '',
    severity: (f?.severity ?? 'low') as 'low'|'medium'|'high',
    rationale: f?.rationale ?? '',
    suggestion: f?.suggestion ?? '',
    span_start: typeof f?.span_start === 'number' ? f?.span_start : null,
    span_end:   typeof f?.span_end   === 'number' ? f?.span_end   : null,
    context: f?.context ?? '',
    keywords: Array.isArray(f?.keywords) ? (f?.keywords as string[]).filter(Boolean) : []
  }
}

// Lightweight client-side highlighter (no server dependency)
export function highlightText(text: string, keywords: string[]) {
  if (!text || !keywords?.length) return text
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = keywords.map(esc).join('|')
  if (!pattern) return text
  const re = new RegExp(`\\b(${pattern})\\b`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}

// Safe clipboard copy
export async function copyToClipboard(s: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(s)
    }
  } catch {}
}