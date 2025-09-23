import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileText, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceText.trim()) {
      toast({
        title: "Contract text required",
        description: "Please paste your contract text to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Get the current session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to analyze contracts.",
          variant: "destructive",
        });
        navigate("/sign-in");
        return;
      }

      // Call the analyze-contract edge function
      const { data, error } = await supabase.functions.invoke('analyze-contract', {
        body: {
          title: title.trim() || undefined,
          source_text: sourceText.trim()
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        toast({
          title: "Analysis failed",
          description: error.message || "Failed to analyze contract. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to the report page with the analysis ID
      navigate(`/app/report/${data.analysis_id}`);

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Contract Analysis
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload or paste your contract text to get instant AI-powered insights
          </p>
        </div>

        <Card className="shadow-medium border-0 bg-gradient-secondary">
          <CardContent className="p-8 md:p-12">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Ready to analyze your contract?
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed text-center">
              Paste your contract text below to get started. Our AI will analyze the document for potential risks, 
              payment terms, and important clauses you should be aware of.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
              <div className="space-y-2 text-left">
                <Label htmlFor="title">Contract Title (Optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Freelance Web Development Agreement"
                  className="border-primary/20 focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="contract-text">Contract Text *</Label>
                <Textarea
                  id="contract-text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste your contract text here..."
                  className="min-h-[300px] border-primary/20 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>
              
              <div className="flex items-center justify-center">
                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg" 
                  className="px-8"
                  disabled={isAnalyzing || !sourceText.trim()}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Contract
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 p-4 bg-background/50 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <UploadIcon className="w-4 h-4" />
                No files yet — paste text. File uploads coming later.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick tips */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2">✨ What we analyze</h3>
            <p className="text-sm text-muted-foreground">
              Payment terms, deadlines, liability clauses, and potential risks
            </p>
          </div>
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2">🔒 Your privacy</h3>
            <p className="text-sm text-muted-foreground">
              Your contracts are processed securely and never stored permanently
            </p>
          </div>
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-semibold mb-2">⚡ Get results</h3>
            <p className="text-sm text-muted-foreground">
              Instant analysis with actionable insights and recommendations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;