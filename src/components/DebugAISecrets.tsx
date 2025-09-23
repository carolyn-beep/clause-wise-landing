import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bug, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AISecretsStatus {
  hasApiKey: boolean;
  provider: string | null;
  model: string | null;
  environment?: string;
  timestamp?: string;
}

export const DebugAISecrets = () => {
  const [status, setStatus] = useState<AISecretsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkSecrets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-debug-ai-secrets', {
        method: 'GET'
      });

      if (error) {
        console.error('Debug endpoint error:', error);
        toast({
          title: "Debug check failed",
          description: error.message || "Could not check AI secrets status",
          variant: "destructive",
        });
        return;
      }

      setStatus(data);
      toast({
        title: "Debug check complete",
        description: `API Key: ${data.hasApiKey ? '✅' : '❌'}, Provider: ${data.provider || 'Not set'}`,
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred during debug check",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <Card className="shadow-soft border-0 border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Bug className="w-5 h-5" />
          AI Secrets Debug (Dev Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={checkSecrets}
            disabled={isLoading}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Check AI Secrets
              </>
            )}
          </Button>
        </div>

        {status && (
          <div className="space-y-3 p-3 bg-white/50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">OpenAI API Key:</span>
              {status.hasApiKey ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Set
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  <XCircle className="w-3 h-3 mr-1" />
                  Missing
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Provider:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                {status.provider || 'Not set'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Model:</span>
              <Badge variant="outline" className="bg-purple-50 text-purple-800">
                {status.model || 'Not set'}
              </Badge>
            </div>

            {status.environment && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Environment:</span>
                <Badge variant="outline" className="bg-gray-50 text-gray-800">
                  {status.environment}
                </Badge>
              </div>
            )}

            {status.timestamp && (
              <div className="text-xs text-muted-foreground">
                Last checked: {new Date(status.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-amber-700">
          This debug panel helps verify that AI secrets are properly configured in Supabase Edge Functions.
        </p>
      </CardContent>
    </Card>
  );
};