import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Assert that user is authenticated, throw error if not
 */
async function assertAuthenticated(authHeader: string | null, supabase: any): Promise<{ user: any }> {
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check if running in production (simulate NODE_ENV check)
    const nodeEnv = Deno.env.get('NODE_ENV') || Deno.env.get('ENVIRONMENT') || 'development';
    if (nodeEnv === 'production') {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Require authentication
    const authHeader = req.headers.get('Authorization');
    await assertAuthenticated(authHeader, supabase);

    // Check secrets status without exposing actual values
    const hasApiKey = Boolean(Deno.env.get('OPENAI_API_KEY'));
    const provider = Deno.env.get('AI_PROVIDER') || null;
    const model = Deno.env.get('OPENAI_MODEL') || null;

    const debugInfo = {
      hasApiKey,
      provider,
      model,
      // Additional debug info
      environment: nodeEnv,
      timestamp: new Date().toISOString()
    };

    console.log('Debug AI secrets check:', debugInfo);

    return new Response(
      JSON.stringify(debugInfo),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    
    // Return appropriate error response
    if (error.message.includes('Authorization') || error.message.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});