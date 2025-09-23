import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runAIAnalysis } from '../_shared/ai/index.ts';
import { ensureSafeInput, formatModerationMessage, type ModerationError } from '../_shared/ai/moderation.ts';
import { runRuleAnalyzer } from '../_shared/ai/rule-analyzer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  title?: string;
  source_text: string;
  useAI?: boolean;
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
  aiRan: boolean;
  aiFallbackUsed: boolean;
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

    // 1) Require authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // 2) Validate input
    const { title, source_text, useAI = true }: AnalyzeRequest = await req.json();
    
    if (!source_text || typeof source_text !== 'string' || !source_text.trim()) {
      return new Response(
        JSON.stringify({ error: 'source_text is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedText = source_text.trim();
    console.log(`Analyzing contract: ${title || 'Untitled'}, useAI: ${useAI}`);
    console.log(`Text length: ${trimmedText.length} characters`);

    // 3) Insert CONTRACT row first
    const { data: contract, error: cErr } = await supabase
      .from('contracts')
      .insert({
        user_id: user.id,
        title: title || null,
        source_text: trimmedText
      })
      .select()
      .single();

    if (cErr || !contract) {
      console.error('Contract insert error:', cErr);
      return new Response(
        JSON.stringify({ error: 'Failed to save contract' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Contract saved with ID: ${contract.id}`);

    // 4) Run RULE-BASED analyzer
    const ruleBased = await runRuleAnalyzer(trimmedText);

    // 5) Optionally run AI analysis
    let result;
    if (useAI === true) {
      try {
        // Content moderation check
        await ensureSafeInput(trimmedText);
        
        // Run AI analysis
        const ai = await runAIAnalysis(trimmedText);

        // Merge results
        // a) Flags de-dup (prefer AI severity on conflicts)
        function norm(s: string): string { 
          return s.toLowerCase().replace(/\s+/g, ' ').slice(0, 140); 
        }
        
        const pickSeverity = (a: string, b: string): 'low' | 'medium' | 'high' => {
          const rank = { low: 0, medium: 1, high: 2 };
          // prefer AI on tie or conflict
          return rank[b as keyof typeof rank] >= rank[a as keyof typeof rank] ? b as 'low' | 'medium' | 'high' : a as 'low' | 'medium' | 'high';
        };

        const byKey = new Map(); // key = normalized snippet
        for (const f of ruleBased.flags) {
          byKey.set(norm(f.clause), { ...f });
        }
        for (const f of ai.flags) {
          const k = norm(f.clause);
          if (!byKey.has(k)) {
            byKey.set(k, { ...f });
          } else {
            const prev = byKey.get(k);
            byKey.set(k, {
              clause: prev.clause.length >= f.clause.length ? prev.clause : f.clause,
              severity: pickSeverity(prev.severity, f.severity),
              rationale: f.rationale || prev.rationale,
              suggestion: f.suggestion || prev.suggestion
            });
          }
        }
        const mergedFlags = Array.from(byKey.values());

        // b) Overall risk = max(ruleBased, ai)
        const rank = { low: 0, medium: 1, high: 2 };
        const overall_risk = (rank[ai.overall_risk as keyof typeof rank] > rank[ruleBased.overall_risk as keyof typeof rank])
          ? ai.overall_risk
          : ruleBased.overall_risk;

        // c) Summary prefer AI
        const summary = ai.summary || ruleBased.summary;

        result = { overall_risk, summary, flags: mergedFlags, aiRan: true, aiFallbackUsed: false };
      } catch (err) {
        // Moderation or AI error -> fall back to rule-based only
        if (err && (err as ModerationError).code === 'CONTENT_BLOCKED') {
          const moderationError = err as ModerationError;
          return new Response(JSON.stringify({
            error: 'Content blocked',
            message: formatModerationMessage(moderationError.categories || [])
          }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        console.error('AI analysis failed', err);
        result = { ...ruleBased, aiRan: false, aiFallbackUsed: true };
      }
    } else {
      result = { ...ruleBased, aiRan: false, aiFallbackUsed: false };
    }

    // 6) Insert ANALYSIS row
    const { overall_risk, summary, flags } = result;
    const { data: analysis, error: aErr } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        contract_id: contract.id,
        overall_risk,
        summary
      })
      .select()
      .single();

    if (aErr || !analysis) {
      console.error('Analysis insert error:', aErr);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analysis saved with ID: ${analysis.id}`);

    // 7) Bulk insert FLAGS
    if (flags.length > 0) {
      const rows = flags.map(f => ({
        user_id: user.id,
        analysis_id: analysis.id,
        clause: f.clause,
        severity: f.severity,
        rationale: f.rationale,
        suggestion: f.suggestion
      }));

      const { error: fErr } = await supabase.from('flags').insert(rows);
      if (fErr) {
        console.error('Flag insert error', fErr);
      } else {
        console.log(`${flags.length} flags saved`);
      }
    }

    // 8) Respond 200
    const response: AnalyzeResponse = {
      contract_id: contract.id,
      analysis_id: analysis.id,
      overall_risk,
      summary,
      flags,
      aiRan: result.aiRan,
      aiFallbackUsed: result.aiFallbackUsed
    };

    console.log(`Analysis complete: ${overall_risk} risk, ${flags.length} flags, AI: ${result.aiRan}, fallback: ${result.aiFallbackUsed}`);

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