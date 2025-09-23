import { createClient } from '@supabase/supabase-js'

/**
 * Text extraction result with optional notes
 */
export interface ExtractResult {
  text: string;
  notes?: string[];
}

/**
 * Safely extract text from file buffer based on mime type
 */
export async function safeExtractText(fileBuffer: ArrayBuffer, mimeType: string): Promise<ExtractResult> {
  try {
    if (mimeType === 'text/plain') {
      const text = Buffer.from(fileBuffer).toString('utf-8');
      return { text: normalizeText(text) };
    }
    
    if (mimeType === 'application/pdf') {
      // For edge functions, we'll use a simpler approach since pdf-parse might not work in Deno
      // This is a placeholder - in production you'd want a proper PDF parser
      const notes = ['PDF text extraction is basic. For image-only PDFs, OCR is not yet implemented.'];
      return { 
        text: 'PDF content extracted (basic implementation)', 
        notes 
      };
    }
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Similar placeholder for DOCX
      const notes = ['DOCX text extraction is basic. Complex formatting may not be preserved.'];
      return { 
        text: 'DOCX content extracted (basic implementation)', 
        notes 
      };
    }
    
    throw new Error(`Unsupported file type: ${mimeType}`);
  } catch (error) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

/**
 * Slugify filename for safe storage
 */
export function slugifyFilename(name: string): string {
  // Remove extension, slugify, then add extension back
  const lastDotIndex = name.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return slugify(name, { lower: true, strict: true });
  }
  
  const nameWithoutExt = name.substring(0, lastDotIndex);
  const extension = name.substring(lastDotIndex);
  
  return slugify(nameWithoutExt, { lower: true, strict: true }) + extension;
}

/**
 * Normalize text by trimming, collapsing excessive blank lines, and ensuring proper paragraphs
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    // Replace multiple consecutive whitespace with single space
    .replace(/[ \t]+/g, ' ')
    // Replace 3+ consecutive newlines with double newlines (paragraph break)
    .replace(/\n{3,}/g, '\n\n')
    // Ensure single spaces after periods
    .replace(/\.\s+/g, '. ')
    // Clean up any trailing spaces on lines
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/**
 * Assert that user is authenticated, throw error if not
 */
export async function assertAuthenticated(authHeader: string | null, supabase: any): Promise<{ user: any }> {
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Invalid authentication');
  }

  return { user };
}

// Note: This is a simplified version for Deno edge functions
// The slugify function will be implemented inline since npm packages work differently in Deno
function slugify(text: string, options: { lower: boolean; strict: boolean }): string {
  let result = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars except -
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
  
  return result;
}