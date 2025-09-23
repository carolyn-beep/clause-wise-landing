import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertTriangle, CheckCircle, AlertCircle, Copy, Bot, Zap, Edit, FileText, Info } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFlag, highlightText, copyToClipboard } from '@/lib/safeFlag';
import { format } from "date-fns";

const Demo = () => {
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
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
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!sourceText.trim()) {
      toast({
        title: "Contract text required",
        description: "Please paste your contract text to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (sourceText.length < 100) {
      toast({
        title: "Contract too short",
        description: "Please provide a more substantial contract text for analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setFlags([]);

    try {
      const response = await fetch('https://fecwtquqfbgpawkmxzvz.supabase.co/functions/v1/api-demo-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_text: sourceText,
          useAI: useAI
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      
      // Transform the simplified response to match the expected format
      const analysisData = {
        id: 'demo-' + Date.now(),
        overall_risk: data.overall_risk,
        summary: data.summary,
        created_at: new Date().toISOString(),
        ai_provider: data.aiRan ? 'openai' : null,
        ai_model: data.aiRan ? 'demo' : null,
        ai_fallback_used: !data.aiRan,
        contract: { title: title || "Demo Contract" },
        flags_ai: data.aiRan ? data.flags : null,
        flags_rule: !data.aiRan ? data.flags : null
      };

      setAnalysis(analysisData);
      setFlags(data.flags || []);

      toast({
        title: "Analysis complete!",
        description: "Your contract has been analyzed. Scroll down to see the results.",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

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

  const handleRedline = async (clause: string, suggestion: string) => {
    setRedlineModal(prev => ({ ...prev, isOpen: true, loading: true, data: null }));
    setRedlineTab("redline");

    try {
      const response = await fetch('https://fecwtquqfbgpawkmxzvz.supabase.co/functions/v1/api-redline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY3d0cXVxZmJncGF3a214enZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDUyNjUsImV4cCI6MjA3NDIyMTI2NX0.xixQal5K_87D-fpOnLz1Fqx3kZUGeL3mbSZ2LH8gT-k'
        },
        body: JSON.stringify({
          clause,
          suggestion,
          useAI: false // Use fallback for demo to avoid auth issues
        })
      });

      if (!response.ok) {
        throw new Error('Redline failed');
      }

      const data = await response.json();
      setRedlineModal(prev => ({
        ...prev,
        loading: false,
        data: {
          ...data,
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

        <pre className="whitespace-pre-wrap text-sm font-mono"
             dangerouslySetInnerHTML={{ __html: html }} />

        {f.context ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs text-muted-foreground">View context</summary>
            <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{f.context}</div>
          </details>
        ) : null}

        <div className="text-sm"><strong>Why:</strong> {f.rationale || '—'}</div>
        <div className="text-sm"><strong>Suggestion:</strong> {f.suggestion || '—'}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 md:p-8 lg:p-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Demo Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-900 font-medium">
              Demo mode — nothing is saved.
            </p>
          </div>

          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Try Contract Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Contract Title (Optional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Freelance Agreement with Acme Corp"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="source-text">Contract Text</Label>
                  <Textarea
                    id="source-text"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Paste your contract text here..."
                    className="mt-1 min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {sourceText.length.toLocaleString()} characters
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-ai"
                    checked={useAI}
                    onCheckedChange={setUseAI}
                  />
                  <Label htmlFor="use-ai" className="text-sm">
                    Use AI analysis (when available)
                  </Label>
                </div>

                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !sourceText.trim()}
                  size="lg"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing Contract...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Contract
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {isAnalyzing && (
            <Card>
              <CardContent className="py-12">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-3/4 mx-auto" />
                  <Skeleton className="h-32 w-full" />
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {analysis && (
            <>
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Analysis Results
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(analysis.overall_risk)}
                      {getAnalysisTypeBadge()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed mb-4">{analysis.summary}</p>
                  <p className="text-muted-foreground text-sm italic">This is not legal advice.</p>
                </CardContent>
              </Card>

              {/* Flags Results */}
              <div className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                    <h2 className="text-xl font-semibold">Issues Found</h2>
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
                        {flags.map((flag, index) => (
                          <FCard key={index} rawFlag={flag} />
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
                        {analysis.flags_ai.map((flag: any, index: number) => (
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
                        {analysis.flags_rule.map((flag: any, index: number) => (
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
            </>
          )}
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

export default Demo;