import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { diffWords } from 'https://esm.sh/diff@8.0.2';

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
    // Initialize Supabase client for auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { clause, suggestion, useAI = true } = await req.json();

    if (!clause || !suggestion) {
      return new Response(JSON.stringify({ error: 'clause and suggestion are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let rewrite = clause;

    // If useAI is true, attempt AI rewriting
    if (useAI) {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openAIApiKey) {
        try {
          console.log('Attempting AI rewrite for user:', user.id);
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-5-2025-08-07',
              messages: [
                {
                  role: 'system',
                  content: 'You are a legal writing assistant. Rewrite contract clauses implementing suggestions while maintaining neutral, concise, legally consistent language. Return only JSON format: { "rewrite": "..." }'
                },
                {
                  role: 'user',
                  content: `Original clause: "${clause}"\n\nSuggestion: "${suggestion}"\n\nRewrite this clause implementing the suggestion. Return JSON: { "rewrite": "..." } ONLY.`
                }
              ],
              max_completion_tokens: 500,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            
            try {
              const parsed = JSON.parse(content);
              if (parsed.rewrite && typeof parsed.rewrite === 'string') {
                rewrite = parsed.rewrite;
                console.log('AI rewrite successful');
              } else {
                throw new Error('Invalid JSON structure');
              }
            } catch (parseError) {
              console.warn('Failed to parse AI response as JSON:', parseError);
              // Fallback to manual rewrite
              rewrite = clause + " " + "(" + suggestion + ")";
            }
          } else {
            console.warn('OpenAI API error:', response.status, response.statusText);
            // Fallback to manual rewrite
            rewrite = clause + " " + "(" + suggestion + ")";
          }
        } catch (aiError) {
          console.error('AI rewrite error:', aiError);
          // Fallback to manual rewrite
          rewrite = clause + " " + "(" + suggestion + ")";
        }
      } else {
        console.warn('OpenAI API key not configured, using fallback');
        // Fallback to manual rewrite
        rewrite = clause + " " + "(" + suggestion + ")";
      }
    }

    // Compute word diff
    const diff = diffWords(clause, rewrite);

    // Build HTML markup
    let html = '';
    let plainDiff = '';

    for (const part of diff) {
      if (part.removed) {
        html += `<del>${escapeHtml(part.value)}</del>`;
        plainDiff += `[-${part.value}-]`;
      } else if (part.added) {
        html += `<ins>${escapeHtml(part.value)}</ins>`;
        plainDiff += `{+${part.value}+}`;
      } else {
        html += escapeHtml(part.value);
        plainDiff += part.value;
      }
    }

    const result = {
      rewrite,
      html,
      plain_diff: plainDiff
    };

    console.log('Redline completed successfully for user:', user.id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in api-redline function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}