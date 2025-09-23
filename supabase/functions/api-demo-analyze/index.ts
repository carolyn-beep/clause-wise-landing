import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runAIAnalysis } from '../_shared/ai/index.ts';
import { runRuleAnalyzer } from '../_shared/ai/rule-analyzer.ts';
import { extractSpan, riskKeywordsFor } from '../_shared/text/clauses.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { source_text, title = "Demo Contract", use_ai = true } = await req.json();

    if (!source_text || source_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Contract text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Demo analysis started for contract length:', source_text.length);

    let aiResult = null;
    let ruleResult = null;
    let overall_risk = 'low';
    let summary = '';
    let allFlags: any[] = [];

    // Try AI analysis first if requested
    if (use_ai) {
      try {
        console.log('Attempting AI analysis...');
        aiResult = await runAIAnalysis(source_text);
        console.log('AI analysis completed successfully');
        
        overall_risk = aiResult.overall_risk || 'medium';
        summary = aiResult.summary || 'AI analysis completed.';
        
        if (aiResult.flags && Array.isArray(aiResult.flags)) {
          allFlags.push(...aiResult.flags.map(f => ({ ...f, source: 'ai' })));
        }
      } catch (aiError) {
        console.warn('AI analysis failed:', aiError);
        // Continue with rule-based analysis as fallback
      }
    }

    // Always run rule-based analysis
    try {
      console.log('Running rule-based analysis...');
      ruleResult = await runRuleAnalyzer(source_text);
      console.log('Rule-based analysis completed');

      // If no AI result, use rule result for overall assessment
      if (!aiResult) {
        overall_risk = ruleResult.overall_risk || 'low';
        summary = ruleResult.summary || 'Analysis completed using rule-based detection.';
      }

      if (ruleResult.flags && Array.isArray(ruleResult.flags)) {
        allFlags.push(...ruleResult.flags.map(f => ({ ...f, source: 'rule' })));
      }
    } catch (ruleError) {
      console.error('Rule-based analysis failed:', ruleError);
      if (!aiResult) {
        throw ruleError;
      }
    }

    // Enhance flags with span and keyword information
    const enhancedFlags = allFlags.map(flag => {
      try {
        const { start, end, context } = extractSpan(source_text, flag.clause || '');
        const keywords = riskKeywordsFor(flag);
        
        return {
          ...flag,
          span_start: start,
          span_end: end,
          context: context,
          keywords: keywords
        };
      } catch (error) {
        console.warn('Error enhancing flag:', error);
        return {
          ...flag,
          span_start: null,
          span_end: null,
          context: null,
          keywords: []
        };
      }
    });

    // Separate flags by source
    const flags_ai = enhancedFlags.filter(f => f.source === 'ai').map(f => {
      const { source, ...rest } = f;
      return rest;
    });
    
    const flags_rule = enhancedFlags.filter(f => f.source === 'rule').map(f => {
      const { source, ...rest } = f;
      return rest;
    });

    const response = {
      analysis: {
        id: 'demo-' + Date.now(),
        overall_risk,
        summary,
        created_at: new Date().toISOString(),
        ai_provider: aiResult ? 'openai' : null,
        ai_model: aiResult ? 'demo' : null,
        ai_fallback_used: !aiResult && ruleResult,
        contract: { title },
        flags_ai: flags_ai.length > 0 ? flags_ai : null,
        flags_rule: flags_rule.length > 0 ? flags_rule : null
      },
      flags: enhancedFlags.map(f => {
        const { source, ...rest } = f;
        return rest;
      })
    };

    console.log('Demo analysis completed successfully');

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