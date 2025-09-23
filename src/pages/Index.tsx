import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { CheckCircle, Shield, Zap, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
            AI Contract Review for Freelancers
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Get instant insights on your contracts. Identify risks, understand terms, and negotiate with confidence. Built specifically for freelancers and independent contractors.
          </p>
          
          <Link to="/app">
            <Button variant="hero" size="lg" className="text-lg px-12 py-4 mb-16">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-4 py-16 bg-gradient-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center shadow-soft hover:shadow-medium transition-smooth border-0">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Instant Analysis</h3>
              <p className="text-muted-foreground">
                Upload your contract and get AI-powered analysis in seconds. Identify potential issues before you sign.
              </p>
            </Card>

            <Card className="p-8 text-center shadow-soft hover:shadow-medium transition-smooth border-0">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Risk Detection</h3>
              <p className="text-muted-foreground">
                Automatically spot unfavorable clauses, payment risks, and legal red flags that could hurt your business.
              </p>
            </Card>

            <Card className="p-8 text-center shadow-soft hover:shadow-medium transition-smooth border-0">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Save Time & Money</h3>
              <p className="text-muted-foreground">
                Skip expensive lawyer consultations for routine reviews. Get professional-grade analysis at a fraction of the cost.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
            ClauseWise
          </div>
          <p className="text-muted-foreground">
            AI-powered contract review for freelancers and independent contractors.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;