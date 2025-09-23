import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the JWT token and verify the user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file upload for user: ${user.id}`);

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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`File details: ${file.name}, ${file.type}, ${file.size} bytes`);

    let extractedText = '';
    let notes: string[] = [];

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
        // For PDF files, check if it's likely an image-only PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 1000));
        
        // Simple heuristic: if PDF has very few text objects, it's likely scanned/image-only
        const textObjectCount = (pdfString.match(/BT|Tj|TJ/g) || []).length;
        
        if (textObjectCount === 0) {
          extractedText = `Please copy and paste your contract text below. This looks like a scanned/image PDF. OCR isn't enabled yet.`;
          notes.push("This looks like a scanned/image PDF. OCR isn't enabled yet.");
        } else {
          extractedText = `Please copy and paste your contract text below. PDF text extraction is not yet implemented.`;
          notes.push("PDF text extraction is not yet implemented");
        }
        
      } catch (error) {
        console.error('PDF processing error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process PDF file',
            user_friendly: true 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExtension === '.docx') {
      try {
        extractedText = `Please copy and paste your contract text below. DOCX text extraction is not yet implemented.`;
        notes.push("DOCX text extraction is not yet implemented");
      } catch (error) {
        console.error('DOCX processing error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process DOCX file',
            user_friendly: true 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
    if (analyzeNow && extractedText.trim()) {
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('Error calling analyze-contract endpoint:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to analyze contract',
            message: 'Text was extracted successfully, but analysis failed. Please try the analyze step manually.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing file upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error during file processing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});