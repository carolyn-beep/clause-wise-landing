import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header for user verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Authorization required', {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Verify the user token using anon key client
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response('Invalid authentication', {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Get analysisId from query parameters
    const url = new URL(req.url);
    const analysisId = url.searchParams.get('analysisId');

    if (!analysisId) {
      return new Response('analysisId parameter is required', {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log('Exporting CSV for analysis:', analysisId, 'user:', user.id);

    // Verify analysis belongs to user and fetch analysis data
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select(`
        id,
        created_at,
        overall_risk,
        summary,
        contract:contracts(title)
      `)
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (analysisError) {
      console.error('Analysis fetch error:', analysisError);
      return new Response('Error fetching analysis', {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!analysis) {
      return new Response('Analysis not found or access denied', {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Fetch flags for this analysis
    const { data: flags, error: flagsError } = await supabase
      .from('flags')
      .select('severity, clause, rationale, suggestion')
      .eq('analysis_id', analysisId)
      .eq('user_id', user.id)
      .order('severity', { ascending: false });

    if (flagsError) {
      console.error('Flags fetch error:', flagsError);
      return new Response('Error fetching flags', {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Helper function to escape CSV fields
    const escapeCsvField = (field: string | null): string => {
      if (!field) return '""';
      
      // Replace newlines with spaces and normalize whitespace
      const cleaned = field.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Always quote fields to handle commas and quotes safely
      const escaped = cleaned.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    // Generate CSV content
    const csvHeader = 'Severity,Clause,Rationale,Suggestion';
    const csvRows = flags?.map(flag => {
      const severity = escapeCsvField(flag.severity || '');
      const clause = escapeCsvField(flag.clause || '');
      const rationale = escapeCsvField(flag.rationale || '');
      const suggestion = escapeCsvField(flag.suggestion || '');
      
      return `${severity},${clause},${rationale},${suggestion}`;
    }) || [];

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Determine filename
    const contractTitle = analysis.contract?.title || 'contract';
    const safeTitle = contractTitle.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `clausewise-analysis-${safeTitle}-${analysisId.substring(0, 8)}.csv`;

    console.log('CSV export completed successfully for user:', user.id, 'filename:', filename);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in api-export-csv function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});