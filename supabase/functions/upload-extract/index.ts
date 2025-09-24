import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { newReqId, logEvent } from '../_shared/obs/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const req_id = newReqId();
  const startTime = Date.now();
  logEvent('upload_start', { req_id, route: '/api/upload-extract' });

  console.log(`${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { 
        ...corsHeaders,
        'x-req-id': req_id 
      } 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-req-id': req_id 
        } 
      }
    );
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-req-id': req_id 
          } 
        }
      );
    }

    // Get the JWT token and verify the user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-req-id': req_id 
          } 
        }
      );
    }

    console.log(`Processing file upload for user: ${user.id}`);
    logEvent('upload_authed', { req_id, user_id: user.id });

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const analyzeNow = formData.get('analyzeNow') === 'true';
    const useAI = formData.get('useAI') !== 'false'; // Default to true unless explicitly false
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return new Response(
        JSON.stringify({ 
          error: 'Only PDF, DOCX, or TXT files are supported',
          user_friendly: true 
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-req-id': req_id 
          } 
        }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ 
          error: 'File too large (max 10MB)',
          user_friendly: true 
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-req-id': req_id 
          } 
        }
      );
    }

    console.log(`File details: ${file.name}, ${file.type}, ${file.size} bytes`);

    let extractedText = '';
    let notes: string[] = [];
    const extractStartTime = Date.now();

    // Extract text based on file type
    if (file.type === 'text/plain' || fileExtension === '.txt') {
      // Simple text file - read directly
      extractedText = await file.text();
      
      // Check if text is empty or very short (might be corrupted file)
      if (!extractedText.trim()) {
        notes.push("No text content found in the file");
      } else if (extractedText.trim().length < 50) {
        notes.push("File contains very little text - please verify this is the correct file");
      }
    } else if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      try {
        // Extract text from PDF using a Deno-compatible approach (no Node APIs)
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Heuristic text extraction from PDF source
        let pdfText = '';
        
        try {
          // Decode bytes to a string we can regex over
          const full = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);

          // 1) Extract text objects between BT/ET blocks (layout operators removed)
          const btEtBlocks = full.match(/BT\s*[\s\S]*?\s*ET/g) || [];
          for (const block of btEtBlocks) {
            // Pull out strings inside parentheses within this text block
            const parenMatches = block.match(/\((?:\\.|[^\\()])+\)/g) || [];
            for (const m of parenMatches) {
              let t = m.slice(1, -1);
              // Unescape common PDF escapes
              t = t
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\');
              if (/[A-Za-z0-9]/.test(t)) pdfText += t + ' ';
            }

            // Extract hex strings like <48656C6C6F>
            const hexMatches = block.match(/<([0-9A-Fa-f\s]+)>/g) || [];
            for (const hm of hexMatches) {
              const hex = hm.replace(/[<>\s]/g, '');
              if (hex.length >= 4 && hex.length % 2 === 0) {
                let ascii = '';
                for (let i = 0; i < hex.length; i += 2) {
                  const code = parseInt(hex.slice(i, i + 2), 16);
                  // Keep printable ASCII; replace others with space
                  ascii += (code >= 32 && code <= 126) ? String.fromCharCode(code) : ' ';
                }
                if (/[A-Za-z0-9]/.test(ascii)) pdfText += ascii + ' ';
              }
            }
          }

          // 2) Also parse TJ arrays like [(Hello) <0020> (World)] TJ
          const tjArrays = full.match(/\[((?:\\.|[^\]])+)]\s*TJ/g) || [];
          for (const arr of tjArrays) {
            // Pull both () and <> items
            const parts = arr.match(/\((?:\\.|[^\\()])+\)|<([0-9A-Fa-f\s]+)>/g) || [];
            for (const p of parts) {
              if (p.startsWith('(')) {
                let t = p.slice(1, -1)
                  .replace(/\\\(/g, '(')
                  .replace(/\\\)/g, ')')
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\\\/g, '\\');
                if (/[A-Za-z0-9]/.test(t)) pdfText += t + ' ';
              } else {
                const hex = p.replace(/[<>\s]/g, '');
                if (hex.length >= 4 && hex.length % 2 === 0) {
                  let ascii = '';
                  for (let i = 0; i < hex.length; i += 2) {
                    const code = parseInt(hex.slice(i, i + 2), 16);
                    ascii += (code >= 32 && code <= 126) ? String.fromCharCode(code) : ' ';
                  }
                  if (/[A-Za-z0-9]/.test(ascii)) pdfText += ascii + ' ';
                }
              }
            }
          }

          pdfText = pdfText.replace(/\s+/g, ' ').trim();
        } catch (parseError) {
          console.log('Basic PDF text extraction failed:', (parseError as any)?.message || parseError);
        }
        
        if (pdfText && pdfText.length > 50) {
          extractedText = pdfText;
          console.log(`Successfully extracted ${extractedText.length} characters from PDF using heuristic parsing`);
        } else {
          // Fallback: check if it's likely an image-only PDF
          const decoder = new TextDecoder();
          const pdfString = decoder.decode(uint8Array.slice(0, 2000));
          const textObjectCount = (pdfString.match(/BT|Tj|TJ/g) || []).length;
          
          if (textObjectCount === 0) {
            extractedText = `Please copy and paste your contract text below. This looks like a scanned/image PDF that requires OCR (not yet available).`;
            notes.push("This appears to be a scanned/image PDF. OCR capability is not yet implemented.");
          } else {
            extractedText = `Please copy and paste your contract text below. The PDF contains text but our basic extraction couldn't parse it properly.`;
            notes.push("PDF contains text but extraction was unsuccessful - please copy/paste manually");
          }
        }
        }
        
      } catch (error) {
        console.error('PDF processing error:', error);
        // Fallback to manual input
        extractedText = `Please copy and paste your contract text below. PDF text extraction failed.`;
        notes.push("PDF text extraction failed - please copy and paste the text manually");
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExtension === '.docx') {
      try {
        // Extract text from DOCX using mammoth library
        const arrayBuffer = await file.arrayBuffer();
        
        // Import mammoth dynamically
        const mammoth = await import('https://esm.sh/mammoth@1.11.0');
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        extractedText = result.value;
        
        // Check if text extraction was successful
        if (!extractedText || extractedText.trim().length < 50) {
          extractedText = `Please copy and paste your contract text below. DOCX text extraction found very little readable text.`;
          notes.push("DOCX text extraction found very little readable text");
        } else {
          console.log(`Successfully extracted ${extractedText.length} characters from DOCX`);
        }
        
        // Add any messages from mammoth
        if (result.messages && result.messages.length > 0) {
          console.log('Mammoth messages:', result.messages);
        }
        
      } catch (error) {
        console.error('DOCX processing error:', error);
        // Fallback to manual input
        extractedText = `Please copy and paste your contract text below. DOCX text extraction failed: ${error.message}`;
        notes.push("DOCX text extraction failed - please copy and paste the text manually");
      }
    }

    // Store the file in Supabase storage for future reference
    try {
      const fileBuffer = await file.arrayBuffer();
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Don't fail the entire request if storage fails
      } else {
        console.log(`File stored: ${fileName}`);
      }
    } catch (storageError) {
      console.error('Storage error:', storageError);
      // Continue processing even if storage fails
    }

    console.log(`Text extraction complete. Length: ${extractedText.length} characters`);

    // If analyzeNow is true, call the analyze-contract endpoint
    // But only if we have meaningful extracted text (not placeholder messages)
    const isPlaceholder = extractedText.includes('Please copy and paste your contract text below') || 
                         extractedText.includes('extraction is not yet implemented') ||
                         extractedText.includes('extraction failed') ||
                         extractedText.trim().length < 100;
    
    if (analyzeNow && extractedText.trim() && !isPlaceholder) {
      console.log(`Running analysis via analyze-contract endpoint, useAI: ${useAI}`);
      
      try {
        // Call the analyze-contract function
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-contract`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
          },
          body: JSON.stringify({
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension for title
            source_text: extractedText,
            useAI
          })
        });

        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Analysis failed:', errorData);
          
          // Return the analysis error directly to the client
          return new Response(
            JSON.stringify(errorData),
            { 
              status: analyzeResponse.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const analysisResult = await analyzeResponse.json();
        console.log(`Analysis complete via endpoint. Analysis ID: ${analysisResult.analysis_id}`);

        // Return the analysis result
        return new Response(
          JSON.stringify({
            success: true,
            analyzed: true,
            fileName: file.name,
            fileSize: file.size,
            notes: notes.length > 0 ? notes : undefined,
            ...analysisResult
          }),
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'x-req-id': req_id 
            } 
          }
        );

      } catch (error) {
        console.error('Error calling analyze-contract endpoint:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to analyze contract',
            message: 'Text was extracted successfully, but analysis failed. Please try the analyze step manually.'
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'x-req-id': req_id 
            } 
          }
        );
      }
    } else if (analyzeNow && isPlaceholder) {
      // Analysis was requested but skipped due to placeholder text
      console.log('Analysis skipped - extracted text appears to be placeholder content');
      
      return new Response(
        JSON.stringify({ 
          success: true,
          analyzed: false,
          extractedText,
          fileName: file.name,
          fileSize: file.size,
          notes: [...(notes || []), "Analysis skipped - text extraction returned placeholder content. Please copy and paste your contract text manually and try again."],
          message: "File processed but analysis was skipped because text extraction was not successful. Please copy and paste your contract text and analyze manually."
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-req-id': req_id 
          } 
        }
      );
    }

    logEvent('upload_end', {
      req_id,
      status: 200,
      duration_ms: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        analyzed: false,
        extractedText,
        fileName: file.name,
        fileSize: file.size,
        notes: notes.length > 0 ? notes : undefined
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-req-id': req_id 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing file upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error during file processing' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-req-id': req_id 
        } 
      }
    );
  }
});