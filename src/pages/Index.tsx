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
          <h1 className="text-3xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
            Spot contract risks before you sign
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-[60ch] mx-auto font-normal leading-relaxed">
            AI flags issues and suggests safer wording—fast.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link to="/app">
              <Button size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                Analyze a contract
              </Button>
            </Link>
            <Link to="/app?demo=1">
              <Button variant="ghost" size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                View sample report
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card. No signup for demo.
          </p>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-4 py-16 bg-gradient-secondary">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center shadow-soft hover:shadow-medium transition-smooth border-0">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Spot red flags fast</h3>
              <p className="text-muted-foreground">
                Identify indemnity clauses, liability caps, noncompetes, and other risky terms that could hurt your business.
              </p>
            </Card>

            <Card className="p-8 text-center shadow-soft hover:shadow-medium transition-smooth border-0">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Clear, practical suggestions</h3>
              <p className="text-muted-foreground">
                Get actionable language improvements you can paste back into your contract negotiations.
              </p>
            </Card>

            <Card className="p-8 text-center shadow-soft hover:shadow-medium transition-smooth border-0">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Works with paste, PDF/DOCX, or TXT</h3>
              <p className="text-muted-foreground">
                No setup needed — just upload your contract and get instant analysis in any format.
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
          <p className="text-muted-foreground mb-4">
            AI-powered contract review for freelancers and independent contractors.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong>Heads-up:</strong> ClauseWise is an AI assistant, not a law firm. This report isn't legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;