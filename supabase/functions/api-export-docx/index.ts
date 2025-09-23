import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'https://esm.sh/docx@9.5.1';
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

    console.log('Exporting DOCX for analysis:', analysisId, 'user:', user.id);

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

    // Helper function to generate redlines (server-only, no AI for speed)
    const generateRedline = (clause: string, suggestion: string) => {
      // Simple fallback redline: append suggestion
      const rewrite = clause + " " + "(" + suggestion + ")";
      const diff = diffWords(clause, rewrite);
      
      const textRuns: any[] = [];
      for (const part of diff) {
        if (part.removed) {
          textRuns.push(new TextRun({
            text: part.value,
            strike: true,
            color: "dc2626"
          }));
        } else if (part.added) {
          textRuns.push(new TextRun({
            text: part.value,
            underline: {
              type: UnderlineType.SINGLE,
              color: "16a34a"
            },
            color: "16a34a"
          }));
        } else {
          textRuns.push(new TextRun({
            text: part.value
          }));
        }
      }
      
      return textRuns;
    };

    // Build DOCX content
    const children: any[] = [];

    // Title
    children.push(new Paragraph({
      text: "ClauseWise Report",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));

    // Date and risk info
    const createdDate = new Date(analysis.created_at).toLocaleDateString();
    const contractTitle = analysis.contract?.title || 'Untitled Contract';
    const riskLevel = analysis.overall_risk?.toUpperCase() || 'UNKNOWN';
    
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Contract: ${contractTitle}`, bold: true }),
        new TextRun({ text: "\n" }),
        new TextRun({ text: `Analysis Date: ${createdDate}` }),
        new TextRun({ text: "\n" }),
        new TextRun({ text: `Overall Risk: ${riskLevel}`, bold: true })
      ],
      spacing: { after: 400 }
    }));

    // Summary Section
    if (analysis.summary) {
      children.push(new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));

      children.push(new Paragraph({
        text: analysis.summary,
        spacing: { after: 400 }
      }));
    }

    // Flags Section
    if (flags && flags.length > 0) {
      children.push(new Paragraph({
        text: "Issues Found",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));

      flags.forEach((flag, index) => {
        // Severity and clause
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. [${flag.severity?.toUpperCase() || 'UNKNOWN'}] `, bold: true }),
            new TextRun({ text: flag.clause || '', font: "Courier New" })
          ],
          spacing: { before: 200, after: 100 }
        }));

        // Rationale
        if (flag.rationale) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "Why this matters: ", bold: true }),
              new TextRun({ text: flag.rationale })
            ],
            spacing: { after: 100 }
          }));
        }

        // Suggestion
        if (flag.suggestion) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "Suggested approach: ", bold: true }),
              new TextRun({ text: flag.suggestion })
            ],
            spacing: { after: 300 }
          }));
        }
      });

      // Proposed Redlines Section
      children.push(new Paragraph({
        text: "Proposed Redlines",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));

      flags.forEach((flag, index) => {
        if (flag.clause && flag.suggestion) {
          children.push(new Paragraph({
            text: `${index + 1}. Clause Redline:`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }));

          const redlineRuns = generateRedline(flag.clause, flag.suggestion);
          children.push(new Paragraph({
            children: redlineRuns,
            spacing: { after: 300 }
          }));
        }
      });
    } else {
      children.push(new Paragraph({
        text: "No Issues Found",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));

      children.push(new Paragraph({
        text: "Great news! Our analysis didn't find any obvious red flags in this contract.",
        spacing: { after: 400 }
      }));
    }

    // Footer
    children.push(new Paragraph({
      children: [
        new TextRun({ text: "\n" }),
        new TextRun({ text: "Generated by ClauseWise - AI Contract Analysis", italics: true }),
        new TextRun({ text: "\n" }),
        new TextRun({ text: "This is not legal advice.", italics: true, size: 20 })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 }
    }));

    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    // Generate the DOCX buffer
    const buffer = await Packer.toBuffer(doc);

    // Determine filename
    const contractTitle_safe = contractTitle.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `clausewise-report-${contractTitle_safe}-${analysisId.substring(0, 8)}.docx`;

    console.log('DOCX export completed successfully for user:', user.id, 'filename:', filename);

    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in api-export-docx function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});