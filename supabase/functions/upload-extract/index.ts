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
        JSON.stringify({ error: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`File details: ${file.name}, ${file.type}, ${file.size} bytes`);

    let extractedText = '';

    // Extract text based on file type
    if (file.type === 'text/plain' || fileExtension === '.txt') {
      // Simple text file - read directly
      extractedText = await file.text();
    } else if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      // For PDF files, we'll use a simple extraction approach
      // In a production environment, you might want to use a more sophisticated PDF parser
      try {
        // Convert file to base64 and attempt text extraction
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // For now, we'll return a message indicating PDF processing is needed
        // In production, you would integrate with a PDF parsing library
        extractedText = `PDF file "${file.name}" uploaded successfully. Please note: Advanced PDF text extraction is not yet implemented. Please copy and paste the contract text manually for now.`;
        
      } catch (error) {
        console.error('PDF processing error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to process PDF file. Please try converting to text format.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExtension === '.docx') {
      // For DOCX files, similar approach
      try {
        extractedText = `DOCX file "${file.name}" uploaded successfully. Please note: Advanced DOCX text extraction is not yet implemented. Please copy and paste the contract text manually for now.`;
      } catch (error) {
        console.error('DOCX processing error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to process DOCX file. Please try converting to text format.' }),
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

    return new Response(
      JSON.stringify({ 
        success: true,
        extractedText,
        fileName: file.name,
        fileSize: file.size
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