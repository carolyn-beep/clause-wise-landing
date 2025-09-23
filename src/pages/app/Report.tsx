import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Analysis {
  id: string;
  overall_risk: 'low' | 'medium' | 'high';
  summary: string;
  created_at: string;
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
          </CardContent>
        </Card>

        {/* Flags List */}
        {flags.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Issues Found ({flags.length})</h2>
            {flags.map((flag) => (
              <Card key={flag.id} className="border-l-4 border-l-muted">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header with severity */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityBadge(flag.severity)}
                        </div>
                        <div className="bg-muted p-3 rounded-md">
                          <code className="text-sm font-mono text-foreground">
                            {flag.clause.length > 200 
                              ? `${flag.clause.substring(0, 200)}...` 
                              : flag.clause}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Rationale and Suggestion */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 text-red-800">Why this matters:</h4>
                        <p className="text-sm text-muted-foreground">{flag.rationale}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 text-green-800">Suggested approach:</h4>
                        <p className="text-sm text-muted-foreground">{flag.suggestion}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
        </div>
      </div>
    </div>
  );
};

export default Report;