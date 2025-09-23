import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runAIAnalysis } from '../_shared/ai/index.ts';
import { runRuleAnalyzer } from '../_shared/ai/rule-analyzer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory IP cooldown tracking
const ipCooldowns = new Map<string, number>();
const COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_CHARS = 12000;

// Clean up old cooldown entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamp] of ipCooldowns.entries()) {
    if (now - timestamp > COOLDOWN_MS) {
      ipCooldowns.delete(ip);
    }
  }
}, 60000); // Clean up every minute

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check cooldown
    const now = Date.now();
    const lastRequest = ipCooldowns.get(clientIP);
    
    if (lastRequest && (now - lastRequest) < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastRequest)) / 1000);
      return new Response(JSON.stringify({ 
        error: `Rate limit exceeded. Please wait ${remaining} seconds before trying again.` 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { source_text, useAI = false } = await req.json();

    // Validation guards
    if (!source_text || typeof source_text !== 'string') {
      return new Response(JSON.stringify({ error: 'source_text is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (source_text.length > MAX_CHARS) {
      return new Response(JSON.stringify({ 
        error: `Contract text too long. Maximum ${MAX_CHARS.toLocaleString()} characters allowed.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (source_text.trim().length < 50) {
      return new Response(JSON.stringify({ 
        error: 'Contract text too short. Please provide a more substantial contract for analysis.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update IP cooldown
    ipCooldowns.set(clientIP, now);

    console.log('Demo analysis started for IP:', clientIP, 'length:', source_text.length);

    let aiResult = null;
    let aiRan = false;
    let overall_risk = 'low';
    let summary = '';
    let flags: any[] = [];

    // Check if AI is allowed and requested
    const allowDemoAI = Deno.env.get('ALLOW_DEMO_AI') === '1';
    
    if (allowDemoAI && useAI) {
      try {
        console.log('Running AI analysis for demo...');
        aiResult = await runAIAnalysis(source_text);
        aiRan = true;
        
        overall_risk = aiResult.overall_risk || 'medium';
        summary = aiResult.summary || 'AI analysis completed.';
        
        if (aiResult.flags && Array.isArray(aiResult.flags)) {
          flags = aiResult.flags;
        }
        
        console.log('AI analysis completed successfully');
      } catch (aiError) {
        console.warn('AI analysis failed in demo:', aiError);
        aiRan = false;
        // Continue with rule-based analysis
      }
    }

    // Always run rule-based analysis (as fallback or primary)
    try {
      console.log('Running rule-based analysis...');
      const ruleResult = await runRuleAnalyzer(source_text);
      
      // If no AI result, use rule result for overall assessment
      if (!aiRan) {
        overall_risk = ruleResult.overall_risk || 'low';
        summary = ruleResult.summary || 'Analysis completed using rule-based detection.';
        flags = ruleResult.flags || [];
      }
      
      console.log('Rule-based analysis completed');
    } catch (ruleError) {
      console.error('Rule-based analysis failed:', ruleError);
      
      if (!aiRan) {
        throw new Error('Analysis failed. Please try again.');
      }
    }

    const response = {
      overall_risk,
      summary,
      flags: flags || [],
      aiRan
    };

    console.log('Demo analysis completed successfully for IP:', clientIP);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in demo analyze function:', error);
    return new Response(JSON.stringify({ 
      error: 'Analysis failed. Please try again.',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});