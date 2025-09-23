import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock } from "lucide-react";

const History = () => {
  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Analysis History
          </h1>
          <p className="text-muted-foreground text-lg">
            Review your past contract analyses and insights
          </p>
        </div>

        <Card className="shadow-medium border-0 bg-gradient-secondary">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">
              No analyses yet
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Your contract analysis history will appear here once you start analyzing contracts. 
              Each analysis will be saved so you can reference them later.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;