import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-smooth">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            ClauseWise Blog
          </h1>
          <p className="text-xl text-muted-foreground">
            Contract insights, legal tips, and freelancer resources
          </p>
        </div>

        <div className="grid gap-8">
          <Card className="shadow-soft hover:shadow-medium transition-smooth border-0">
            <CardHeader>
              <div className="text-sm text-muted-foreground mb-2">Coming Soon</div>
              <CardTitle className="text-xl">
                5 Red Flags to Watch for in Freelance Contracts
              </CardTitle>
              <CardDescription>
                Learn how to spot potentially problematic clauses that could put your freelance business at risk.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-smooth border-0">
            <CardHeader>
              <div className="text-sm text-muted-foreground mb-2">Coming Soon</div>
              <CardTitle className="text-xl">
                Understanding Payment Terms: What Freelancers Need to Know
              </CardTitle>
              <CardDescription>
                A comprehensive guide to payment clauses, late fees, and protecting your cash flow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-smooth border-0">
            <CardHeader>
              <div className="text-sm text-muted-foreground mb-2">Coming Soon</div>
              <CardTitle className="text-xl">
                Negotiating Better Contracts: A Freelancer's Playbook
              </CardTitle>
              <CardDescription>
                Practical strategies for improving contract terms and protecting your interests.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Blog;