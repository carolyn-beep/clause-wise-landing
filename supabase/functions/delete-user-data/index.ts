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

  if (req.method !== 'DELETE') {
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

    console.log(`Deleting all data for user: ${user.id}`);

    // First, collect all storage_path values for this user
    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select('storage_path')
      .eq('user_id', user.id)
      .not('storage_path', 'is', null);

    if (fetchError) {
      console.error('Error fetching storage paths:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch storage paths' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const storagePaths = contracts?.map(c => c.storage_path).filter(Boolean) || [];
    console.log(`Found ${storagePaths.length} files to delete from storage`);

    // Delete user data in correct order (due to foreign key constraints)
    // 1. Delete flags first (references analyses)
    const { error: flagsError } = await supabase
      .from('flags')
      .delete()
      .eq('user_id', user.id);

    if (flagsError) {
      console.error('Error deleting flags:', flagsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete flags data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Delete analyses (references contracts)
    const { error: analysesError } = await supabase
      .from('analyses')
      .delete()
      .eq('user_id', user.id);

    if (analysesError) {
      console.error('Error deleting analyses:', analysesError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete analyses data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Delete contracts
    const { error: contractsError } = await supabase
      .from('contracts')
      .delete()
      .eq('user_id', user.id);

    if (contractsError) {
      console.error('Error deleting contracts:', contractsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete contracts data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Delete storage objects
    const storageErrors = [];
    for (const storagePath of storagePaths) {
      const { error: storageError } = await supabase.storage
        .from('contracts')
        .remove([storagePath]);
      
      if (storageError) {
        console.error(`Error deleting storage object ${storagePath}:`, storageError);
        storageErrors.push(`${storagePath}: ${storageError.message}`);
      } else {
        console.log(`Successfully deleted storage object: ${storagePath}`);
      }
    }

    if (storageErrors.length > 0) {
      console.warn(`Some storage files could not be deleted: ${storageErrors.join(', ')}`);
      // Don't fail the entire operation for storage cleanup issues
    }

    console.log(`Successfully deleted all data for user: ${user.id}`);

    return new Response(
      JSON.stringify({ message: 'All user data deleted successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error deleting user data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});