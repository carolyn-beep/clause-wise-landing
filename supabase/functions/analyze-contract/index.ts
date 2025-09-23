import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runAIAnalysis } from '../_shared/ai/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  title: string;
  source_text: string;
}

interface Flag {
  clause: string;
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  suggestion: string;
}

interface AnalyzeResponse {
  contract_id: string;
  analysis_id: string;
  overall_risk: 'low' | 'medium' | 'high';
  summary: string;
  flags: Flag[];
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

    console.log(`Authenticated user: ${user.id}`);

    const { title, source_text }: AnalyzeRequest = await req.json();
    
    if (!source_text || typeof source_text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'source_text is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing contract: ${title || 'Untitled'}`);
    console.log(`Text length: ${source_text.length} characters`);

    // 1. Insert into contracts table
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .insert({
        user_id: user.id,
        title: title || 'Untitled Contract',
        source_text
      })
      .select('id')
      .single();

    if (contractError || !contractData) {
      console.error('Contract insert error:', contractError);
      return new Response(
        JSON.stringify({ error: 'Failed to save contract' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contractId = contractData.id;
    console.log(`Contract saved with ID: ${contractId}`);

    // 2. Run AI analysis
    let analysisResult;
    try {
      analysisResult = await runAIAnalysis(source_text);
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // If AI fails, return error with contract ID for potential retry
      return new Response(
        JSON.stringify({ 
          error: error.code === 'AI_ERROR' ? error.message : 'Analysis failed',
          contract_id: contractId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { overall_risk, summary, flags } = analysisResult;

    // 3. Insert into analyses table
    const { data: analysisData, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        contract_id: contractId,
        overall_risk,
        summary
      })
      .select('id')
      .single();

    if (analysisError || !analysisData) {
      console.error('Analysis insert error:', analysisError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysisId = analysisData.id;
    console.log(`Analysis saved with ID: ${analysisId}`);

    // 4. Bulk insert flags if any exist
    if (flags.length > 0) {
      const flagsToInsert = flags.map(flag => ({
        user_id: user.id,
        analysis_id: analysisId,
        clause: flag.clause,
        severity: flag.severity,
        rationale: flag.rationale,
        suggestion: flag.suggestion
      }));

      const { error: flagsError } = await supabase
        .from('flags')
        .insert(flagsToInsert);

      if (flagsError) {
        console.error('Flags insert error:', flagsError);
        return new Response(
          JSON.stringify({ error: 'Failed to save flags' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`${flags.length} flags saved`);
    }

    // 5. Return response with database IDs and analysis results
    const response: AnalyzeResponse = {
      contract_id: contractId,
      analysis_id: analysisId,
      overall_risk,
      summary,
      flags
    };

    console.log(`Analysis complete: ${overall_risk} risk, ${flags.length} flags`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error analyzing contract:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});