import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Sparkles } from "lucide-react";

const Upload = () => {
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
          <CardContent className="p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">
              Ready to analyze your contract?
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Paste your contract text below to get started. Our AI will analyze the document for potential risks, 
              payment terms, and important clauses you should be aware of.
            </p>

            <div className="space-y-4 max-w-3xl mx-auto">
              <Textarea
                placeholder="Paste your contract text here..."
                className="min-h-[200px] border-primary/20 focus:border-primary focus:ring-primary/20 text-left"
              />
              
              <div className="flex items-center justify-center gap-4">
                <Button variant="hero" size="lg" className="px-8">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Contract
                </Button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-background/50 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <UploadIcon className="w-4 h-4" />
                File uploads coming soon! For now, copy and paste your contract text above.
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