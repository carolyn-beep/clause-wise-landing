/**
 * Text processing utilities for contract clause analysis
 */

import sbd from 'https://esm.sh/sbd@1.0.19';

// Common risk keywords for fallback span detection
const RISK_KEYWORDS = [
  'indemn', 'indemnif', 'indemnity',
  'liability', 'liable',
  'arbitration', 'arbitrate',
  'jurisdiction', 'jurisdict',
  'renew', 'renewal', 'automatic',
  'assignment', 'assign',
  'confidential', 'nda', 'non-disclosure',
  'warranty', 'warrant', 'guarantee',
  'force majeure', 'act of god',
  'governing law', 'applicable law',
  'noncompete', 'non-compete', 'restraint',
  'as is', 'as-is',
  'intellectual property', 'ip ownership', 'copyright', 'trademark',
  'termination for convenience', 'terminate', 'breach'
];

/**
 * Split text into sentences using sentence boundary detection
 * @param text - Input text to split
 * @returns Array of sentences
 */
export function splitSentences(text: string): string[] {
  if (!text?.trim()) return [];
  
  return sbd.sentences(text, {
    newline_boundaries: true,
    html_boundaries: false,
    sanitize: false,
    allowed_tags: false,
    preserve_whitespace: false,
    abbreviations: null
  }).filter(sentence => sentence.trim().length > 0);
}

/**
 * Extract span information for a clause within source text
 * @param source - Original contract text
 * @param clause - Clause text to find
 * @returns Span coordinates and context
 */
export function extractSpan(source: string, clause: string): { 
  start: number | null, 
  end: number | null, 
  context: string 
} {
  if (!source || !clause) {
    return { start: null, end: null, context: '' };
  }

  const sourceNorm = source.toLowerCase();
  const clauseNorm = clause.trim().toLowerCase();

  // 1) Try exact case-insensitive match
  const exactIndex = sourceNorm.indexOf(clauseNorm);
  if (exactIndex !== -1) {
    const start = exactIndex;
    const end = exactIndex + clauseNorm.length;
    const context = getContext(source, start, end);
    return { start, end, context };
  }

  // 2) Try middle 12 words of clause
  const words = clauseNorm.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 12) {
    const startIdx = Math.floor((words.length - 12) / 2);
    const middleWords = words.slice(startIdx, startIdx + 12).join(' ');
    const middleIndex = sourceNorm.indexOf(middleWords);
    
    if (middleIndex !== -1) {
      const start = middleIndex;
      const end = middleIndex + middleWords.length;
      const context = getContext(source, start, end);
      return { start, end, context };
    }
  }

  // 3) Fallback: find sentence with risk keywords
  const sentences = splitSentences(source);
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].toLowerCase();
    const hasRiskKeyword = RISK_KEYWORDS.some(keyword => 
      sentence.includes(keyword.toLowerCase())
    );
    
    if (hasRiskKeyword) {
      // Include current sentence ± one neighbor as context
      const contextSentences = [];
      if (i > 0) contextSentences.push(sentences[i - 1]);
      contextSentences.push(sentences[i]);
      if (i < sentences.length - 1) contextSentences.push(sentences[i + 1]);
      
      const context = contextSentences.join(' ').trim();
      const contextIndex = source.indexOf(sentences[i]);
      
      if (contextIndex !== -1) {
        return {
          start: contextIndex,
          end: contextIndex + sentences[i].length,
          context
        };
      }
    }
  }

  // No match found - return empty span with truncated clause as context
  return { 
    start: null, 
    end: null, 
    context: clause.length > 200 ? clause.substring(0, 200) + '...' : clause
  };
}

/**
 * Get surrounding context for a text span
 * @param source - Source text
 * @param start - Start position
 * @param end - End position
 * @param padding - Characters to include before/after (default 150)
 * @returns Context string
 */
function getContext(source: string, start: number, end: number, padding = 150): string {
  const contextStart = Math.max(0, start - padding);
  const contextEnd = Math.min(source.length, end + padding);
  let context = source.substring(contextStart, contextEnd);
  
  // Add ellipsis if truncated
  if (contextStart > 0) context = '...' + context;
  if (contextEnd < source.length) context = context + '...';
  
  return context.trim();
}

/**
 * Highlight keywords in text by wrapping them in <mark> tags
 * @param text - Text to process
 * @param keywords - Keywords to highlight
 * @returns Text with highlighted keywords
 */
export function highlightKeywords(text: string, keywords: string[]): string {
  if (!text || !keywords?.length) return text;
  
  let result = text;
  
  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    if (!keyword?.trim()) continue;
    
    // Create regex for case-insensitive, whole-word matching
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
    
    result = result.replace(regex, '<mark>$&</mark>');
  }
  
  return result;
}

/**
 * Generate risk keywords for a flag based on its properties
 * @param flag - Flag object with severity, clause, etc.
 * @returns Array of relevant keywords
 */
export function riskKeywordsFor(flag: any): string[] {
  if (!flag) return [];
  
  const keywords: string[] = [];
  const clause = (flag.clause || '').toLowerCase();
  const rationale = (flag.rationale || '').toLowerCase();
  const text = `${clause} ${rationale}`;
  
  // Map severity to general risk keywords
  if (flag.severity === 'high') {
    keywords.push('high risk', 'critical', 'severe');
  } else if (flag.severity === 'medium') {
    keywords.push('moderate risk', 'caution');
  } else if (flag.severity === 'low') {
    keywords.push('minor issue', 'advisory');
  }
  
  // Detect specific risk categories
  if (text.includes('payment') || text.includes('fee') || text.includes('cost')) {
    keywords.push('payment', 'financial');
  }
  
  if (text.includes('indemn') || text.includes('liability')) {
    keywords.push('liability', 'indemnification');
  }
  
  if (text.includes('terminat') || text.includes('cancel')) {
    keywords.push('termination', 'cancellation');
  }
  
  if (text.includes('confidential') || text.includes('nda')) {
    keywords.push('confidentiality', 'NDA');
  }
  
  if (text.includes('intellect') || text.includes('copyright') || text.includes('trademark')) {
    keywords.push('intellectual property', 'IP');
  }
  
  if (text.includes('govern') || text.includes('jurisdiction') || text.includes('dispute')) {
    keywords.push('governing law', 'disputes');
  }
  
  if (text.includes('deadline') || text.includes('timeline') || text.includes('deliver')) {
    keywords.push('deadlines', 'delivery');
  }
  
  if (text.includes('warrant') || text.includes('guarantee')) {
    keywords.push('warranties', 'guarantees');
  }
  
  // Remove duplicates and return
  return [...new Set(keywords)];
}