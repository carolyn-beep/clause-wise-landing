import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, ExternalLink, AlertTriangle, CheckCircle, AlertCircle, Plus, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface ContractWithAnalysis {
  id: string;
  title: string;
  created_at: string;
  latest_analysis?: {
    id: string;
    overall_risk: 'low' | 'medium' | 'high';
    created_at: string;
  };
}

const History = () => {
  const [contracts, setContracts] = useState<ContractWithAnalysis[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        // Fetch contracts with their latest analysis
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            id,
            title,
            created_at,
            analyses!inner (
              id,
              overall_risk,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Contracts fetch error:', error);
          toast({
            title: "Error loading contracts",
            description: "Failed to load contract history.",
            variant: "destructive",
          });
          return;
        }

        // Transform data to get the latest analysis for each contract
        const contractsWithLatestAnalysis: ContractWithAnalysis[] = [];
        
        if (data) {
          // Group analyses by contract and get the latest one
          const contractMap = new Map<string, ContractWithAnalysis>();
          
          data.forEach((item: any) => {
            const contractId = item.id;
            const analysis = item.analyses;
            
            if (!contractMap.has(contractId)) {
              contractMap.set(contractId, {
                id: item.id,
                title: item.title,
                created_at: item.created_at,
              });
            }
            
            const contract = contractMap.get(contractId)!;
            
            // Update with latest analysis if this one is newer
            if (analysis && (!contract.latest_analysis || 
                new Date(analysis.created_at) > new Date(contract.latest_analysis.created_at))) {
              contract.latest_analysis = {
                id: analysis.id,
                overall_risk: analysis.overall_risk,
                created_at: analysis.created_at
              };
            }
          });
          
          contractsWithLatestAnalysis.push(...Array.from(contractMap.values()));
        }

        // Also fetch contracts without analyses
        const { data: contractsOnly, error: contractsError } = await supabase
          .from('contracts')
          .select('id, title, created_at')
          .order('created_at', { ascending: false });

        if (contractsError) {
          console.error('Contracts only fetch error:', contractsError);
        } else if (contractsOnly) {
          // Add contracts that don't have analyses yet
          contractsOnly.forEach(contract => {
            if (!contractsWithLatestAnalysis.find(c => c.id === contract.id)) {
              contractsWithLatestAnalysis.push({
                id: contract.id,
                title: contract.title,
                created_at: contract.created_at
              });
            }
          });
        }

        // Sort by creation date (newest first)
        contractsWithLatestAnalysis.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setContracts(contractsWithLatestAnalysis);
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

    fetchContracts();
  }, [toast]);

  // Filter contracts based on search term and risk filter
  useEffect(() => {
    let filtered = [...contracts];

    // Filter by search term (title)
    if (searchTerm.trim()) {
      filtered = filtered.filter(contract =>
        (contract.title || "Untitled Contract")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    // Filter by risk level
    if (riskFilter !== 'all') {
      filtered = filtered.filter(contract =>
        contract.latest_analysis?.overall_risk === riskFilter
      );
    }

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, riskFilter]);

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

  if (loading) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
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

        {contracts.length === 0 ? (
          <Card className="shadow-medium border-0 bg-gradient-secondary">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">
                No contracts yet
              </h2>
              
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Your contract analysis history will appear here once you start analyzing contracts. 
                Each analysis will be saved so you can reference them later.
              </p>

              <Button onClick={() => navigate("/app/upload")}>
                <Plus className="w-4 h-4 mr-2" />
                Analyze Your First Contract
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search contracts by title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={riskFilter} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setRiskFilter(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Risk Levels</SelectItem>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(searchTerm || riskFilter !== 'all') && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredContracts.length} of {contracts.length} contracts
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setRiskFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {filteredContracts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matches found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setRiskFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Contract History ({filteredContracts.length})</span>
                <Button variant="outline" onClick={() => navigate("/app/upload")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Analysis
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-full divide-y divide-border">
                  {/* Header */}
                  <div className="bg-muted/50 px-6 py-3 grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground">
                    <div className="col-span-12 md:col-span-4">Contract</div>
                    <div className="col-span-6 md:col-span-2">Created</div>
                    <div className="col-span-6 md:col-span-3">Risk Level</div>
                    <div className="col-span-12 md:col-span-3 text-right">Actions</div>
                  </div>
                  
                  {/* Contracts */}
                  {filteredContracts.map((contract) => (
                    <div key={contract.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/30 transition-colors">
                      {/* Contract Title */}
                      <div className="col-span-12 md:col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium truncate">
                              {contract.title || "Untitled Contract"}
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      {/* Created Date */}
                      <div className="col-span-6 md:col-span-2">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(contract.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      {/* Risk Level */}
                      <div className="col-span-6 md:col-span-3">
                        {contract.latest_analysis ? (
                          getRiskBadge(contract.latest_analysis.overall_risk)
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-12 md:col-span-3 flex justify-end">
                        {contract.latest_analysis ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/app/report/${contract.latest_analysis!.id}`)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open Report
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No analysis yet
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;