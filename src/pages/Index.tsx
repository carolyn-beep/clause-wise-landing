import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Shield, Zap, Clock } from "lucide-react";
const Index = () => {
  const {
    user
  } = useAuth();
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight mb-6 bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#4338CA] bg-clip-text text-transparent">
            ClauseWise AI contract review for freelancers
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">Upload a contract and get a risk report so you are informed before signing</p>
          
          <Link to={user ? "/app" : "/sign-up"}>
            <Button size="lg" className="text-lg px-12 py-4 mb-16">
              {user ? "Go to Dashboard" : "Get started"}
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
    </div>;
};
export default Index;