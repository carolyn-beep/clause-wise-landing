import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, AlertCircle, Copy, Bot, Zap, Edit, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { normalizeFlag, highlightText, copyToClipboard } from '@/lib/safeFlag';

interface Analysis {
  id: string;
  overall_risk: 'low' | 'medium' | 'high';
  summary: string;
  created_at: string;
  ai_provider: string | null;
  ai_model: string | null;
  ai_fallback_used?: boolean; // Optional for backward compatibility
  flags_ai?: Flag[];
  flags_rule?: Flag[];
  contract: {
    title: string;
  };
}

interface Flag {
  id: string;
  clause: string;
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  suggestion: string;
}

const Report = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [useAI, setUseAI] = useState(true);
  const [redlineModal, setRedlineModal] = useState<{
    isOpen: boolean;
    loading: boolean;
    data: {
      rewrite: string;
      html: string;
      plain_diff: string;
      original: string;
    } | null;
  }>({
    isOpen: false,
    loading: false,
    data: null,
  });
  const [redlineTab, setRedlineTab] = useState("redline");

  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!analysisId) {
        toast({
          title: "Invalid analysis",
          description: "Analysis ID is required.",
          variant: "destructive",
        });
        navigate("/app/history");
        return;
      }

      try {
        // Fetch analysis with contract title
        const { data: analysisData, error: analysisError } = await supabase
          .from('analyses')
          .select(`
            *,
            contract:contracts(title)
          `)
          .eq('id', analysisId)
          .single();

        if (analysisError) {
          console.error('Analysis fetch error:', analysisError);
          toast({
            title: "Analysis not found",
            description: "The requested analysis could not be found.",
            variant: "destructive",
          });
          navigate("/app/history");
          return;
        }

        // Fetch flags for this analysis
        const { data: flagsData, error: flagsError } = await supabase
          .from('flags')
          .select('*')
          .eq('analysis_id', analysisId)
          .order('severity', { ascending: false }); // High severity first

        if (flagsError) {
          console.error('Flags fetch error:', flagsError);
          toast({
            title: "Error loading flags",
            description: "Failed to load analysis details.",
            variant: "destructive",
          });
          return;
        }

        setAnalysis(analysisData as Analysis);
        setFlags(flagsData as Flag[] || []);
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          title: "Something went wrong",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [analysisId, navigate, toast]);

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Low Risk
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Medium Risk
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            High Risk
          </Badge>
        );
    }
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Low</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium</Badge>;
      case 'high':
        return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">High</Badge>;
    }
  };

  const getAnalysisTypeBadge = () => {
    const aiRan = analysis?.ai_provider !== null;
    if (aiRan && !analysis?.ai_fallback_used) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">AI-assisted</Badge>;
    } else if (analysis?.ai_fallback_used) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Rule-based (AI unavailable)</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Rule-based only</Badge>;
    }
  };

  const FCard = ({ rawFlag }: { rawFlag: any }) => {
    const f = normalizeFlag(rawFlag);
    const html = highlightText(f.clause, f.keywords);

    return (
      <div className="rounded-xl border p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full ${
            f.severity === 'high' ? 'bg-red-100 text-red-700' :
            f.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {f.severity.toUpperCase()}
          </span>
          <button className="text-xs underline hover:no-underline" onClick={() => copyToClipboard(f.clause)}>Copy clause</button>
          <button className="text-xs underline hover:no-underline" onClick={() => copyToClipboard(f.suggestion)}>Copy suggestion</button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-6 px-2"
            onClick={() => handleRedline(f.clause, f.suggestion)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Redline
          </Button>
        </div>

        {/* clause with highlights; falls back to plain text if no keywords */}
        <pre className="whitespace-pre-wrap text-sm font-mono"
             dangerouslySetInnerHTML={{ __html: html }} />

        {/* collapsible context; render only if present */}
        {f.context ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-muted-foreground">View context</summary>
            <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{f.context}</div>
          </details>
        ) : null}

        {/* rationale + suggestion */}
        <div className="text-sm"><strong>Why:</strong> {f.rationale || '—'}</div>
        <div className="text-sm"><strong>Suggestion:</strong> {f.suggestion || '—'}</div>
      </div>
    );
  };

  const getCurrentFlags = () => {
    switch (activeTab) {
      case "ai":
        return analysis?.flags_ai || [];
      case "rule":
        return analysis?.flags_rule || [];
      default:
        return flags;
    }
  };

  const getTabFlags = (tab: string) => {
    switch (tab) {
      case "ai":
        return analysis?.flags_ai || [];
      case "rule":
        return analysis?.flags_rule || [];
      default:
        return flags;
    }
  };

  const handleCopySuggestions = async () => {
    const currentFlags = getCurrentFlags();
    if (currentFlags.length === 0) {
      toast({
        title: "No suggestions to copy",
        description: "There are no flagged clauses with suggestions.",
        variant: "default",
      });
      return;
    }

    setIsCopying(true);
    
    try {
      // Format all suggestions into a comprehensive text
      const contractTitle = analysis?.contract?.title || 'Contract Analysis';
      const date = new Date().toLocaleDateString();
      
      let suggestionsText = `SUGGESTED CONTRACT REDLINES\n`;
      suggestionsText += `Contract: ${contractTitle}\n`;
      suggestionsText += `Analysis Date: ${date}\n`;
      suggestionsText += `Overall Risk: ${analysis?.overall_risk?.toUpperCase()}\n\n`;
      
      suggestionsText += `SUMMARY:\n${analysis?.summary}\n\n`;
      
      suggestionsText += `SUGGESTED IMPROVEMENTS:\n\n`;
      
      currentFlags.forEach((flag, index) => {
        suggestionsText += `${index + 1}. CLAUSE ISSUE (${flag.severity.toUpperCase()} PRIORITY)\n`;
        suggestionsText += `Problematic Text: "${flag.clause}"\n`;
        suggestionsText += `Why This Matters: ${flag.rationale}\n`;
        suggestionsText += `Suggested Change: ${flag.suggestion}\n\n`;
      });
      
      suggestionsText += `Generated by ClauseWise - AI Contract Analysis\n`;
      
      await navigator.clipboard.writeText(suggestionsText);
      
      toast({
        title: "Suggestions copied!",
        description: `${currentFlags.length} suggestions copied to clipboard for easy sharing.`,
      });
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleExportCsv = async () => {
    if (!analysisId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to export data.",
          variant: "destructive",
        });
        return;
      }

      // Call edge function with query parameter
      const url = new URL(`https://fecwtquqfbgpawkmxzvz.supabase.co/functions/v1/api-export-csv`);
      url.searchParams.set('analysisId', analysisId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY3d0cXVxZmJncGF3a214enZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDUyNjUsImV4cCI6MjA3NDIyMTI2NX0.xixQal5K_87D-fpOnLz1Fqx3kZUGeL3mbSZ2LH8gT-k'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url2;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || `clausewise-analysis-${analysisId}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url2);

      toast({
        title: "Export successful",
        description: "CSV file has been downloaded.",
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to export CSV. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRedline = async (clause: string, suggestion: string) => {
    setRedlineModal(prev => ({ ...prev, isOpen: true, loading: true, data: null }));
    setRedlineTab("redline");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use the redline feature.",
          variant: "destructive",
        });
        setRedlineModal(prev => ({ ...prev, isOpen: false, loading: false }));
        return;
      }

      const response = await supabase.functions.invoke('api-redline', {
        body: {
          clause,
          suggestion,
          useAI
        }
      });

      if (response.error) {
        throw response.error;
      }

      setRedlineModal(prev => ({
        ...prev,
        loading: false,
        data: {
          ...response.data,
          original: clause
        }
      }));

    } catch (error) {
      console.error('Redline error:', error);
      toast({
        title: "Redline failed",
        description: "Unable to generate redline. Please try again.",
        variant: "destructive",
      });
      setRedlineModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Analysis not found</h2>
          <p className="text-muted-foreground mb-6">The requested analysis could not be found.</p>
          <Button onClick={() => navigate("/app/history")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => navigate("/app/history")}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to History
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">
                {analysis.contract?.title || 'Contract Analysis'}
              </h1>
              {getRiskBadge(analysis.overall_risk)}
              {getAnalysisTypeBadge()}
            </div>
            <p className="text-muted-foreground">
              Analyzed on {format(new Date(analysis.created_at), 'PPP')}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{analysis.summary}</p>
            <p className="text-muted-foreground text-sm mt-4 italic">This is not legal advice.</p>
          </CardContent>
        </Card>

        {/* Flags List with Segmented Control */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">Issues Found</h2>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-ai"
                    checked={useAI}
                    onCheckedChange={setUseAI}
                  />
                  <Label htmlFor="use-ai" className="text-sm text-muted-foreground">
                    Use AI for redlines
                  </Label>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySuggestions}
                disabled={isCopying || getCurrentFlags().length === 0}
                className="gap-2"
              >
                {isCopying ? (
                  <>
                    <Copy className="w-4 h-4 animate-pulse" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Suggested Redlines
                  </>
                )}
              </Button>
            </div>
            
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="all" className="gap-2">
                <FileText className="w-4 h-4" />
                All ({flags.length})
              </TabsTrigger>
              <TabsTrigger 
                value="ai" 
                disabled={!analysis?.flags_ai || analysis.flags_ai.length === 0}
                className="gap-2"
              >
                <Bot className="w-4 h-4" />
                AI only ({getTabFlags("ai").length})
              </TabsTrigger>
              <TabsTrigger 
                value="rule" 
                disabled={!analysis?.flags_rule || analysis.flags_rule.length === 0}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Rule-based only ({getTabFlags("rule").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {flags.length > 0 ? (
                <div className="space-y-4">
                  {flags.map((flag) => (
                    <FCard key={flag.id} rawFlag={flag} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      Great news! Our analysis didn't find any obvious red flags in this contract.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai">
              {analysis?.flags_ai && analysis.flags_ai.length > 0 ? (
                <div className="space-y-4">
                  {analysis.flags_ai.map((flag, index) => (
                    <FCard key={`ai-${index}`} rawFlag={flag} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No AI Flags</h3>
                    <p className="text-muted-foreground text-sm">
                      Not available for this analysis.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rule">
              {analysis?.flags_rule && analysis.flags_rule.length > 0 ? (
                <div className="space-y-4">
                  {analysis.flags_rule.map((flag, index) => (
                    <FCard key={`rule-${index}`} rawFlag={flag} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Rule-based Flags</h3>
                    <p className="text-muted-foreground text-sm">
                      Not available for this analysis.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button variant="outline" onClick={() => navigate("/app/history")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <Button onClick={() => navigate("/app/upload")}>
            <FileText className="w-4 h-4 mr-2" />
            Analyze Another Contract
          </Button>
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Redline Modal */}
      <Dialog open={redlineModal.isOpen} onOpenChange={(open) => setRedlineModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Clause Redline
            </DialogTitle>
          </DialogHeader>

          {redlineModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Generating redline...</span>
            </div>
          ) : redlineModal.data ? (
            <Tabs value={redlineTab} onValueChange={setRedlineTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="redline">Redline</TabsTrigger>
                <TabsTrigger value="clean">Clean Rewrite</TabsTrigger>
                <TabsTrigger value="original">Original</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="redline" className="h-full mt-0">
                  <div className="border rounded-lg p-4 h-full overflow-auto">
                    <style>
                      {`
                        .redline-content del {
                          background-color: #fecaca;
                          color: #dc2626;
                          text-decoration: line-through;
                          padding: 1px 2px;
                          border-radius: 2px;
                        }
                        .redline-content ins {
                          background-color: #bbf7d0;
                          color: #16a34a;
                          text-decoration: underline;
                          padding: 1px 2px;
                          border-radius: 2px;
                        }
                      `}
                    </style>
                    <div 
                      className="text-sm leading-relaxed redline-content"
                      dangerouslySetInnerHTML={{ __html: redlineModal.data.html }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="clean" className="h-full mt-0">
                  <div className="border rounded-lg p-4 h-full overflow-auto flex flex-col">
                    <div className="flex-1">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {redlineModal.data.rewrite}
                      </pre>
                    </div>
                    <div className="pt-4 border-t mt-4">
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(redlineModal.data?.rewrite || '')}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Rewrite
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="original" className="h-full mt-0">
                  <div className="border rounded-lg p-4 h-full overflow-auto">
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {redlineModal.data.original}
                    </pre>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Report;