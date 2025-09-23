import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : '');
        const hasAccessToken = hashParams.has('access_token') || currentUrl.searchParams.has('access_token');
        const code = currentUrl.searchParams.get('code');

        let data: any = null;
        let error: any = null;

        if (hasAccessToken) {
          // Magic link flow where tokens are in URL hash
          const access_token = hashParams.get('access_token') ?? currentUrl.searchParams.get('access_token') ?? '';
          const refresh_token = hashParams.get('refresh_token') ?? currentUrl.searchParams.get('refresh_token') ?? '';
          ({ data, error } = await supabase.auth.setSession({ access_token, refresh_token }));
          // Clean the URL fragment to avoid reprocessing on refresh
          history.replaceState(null, '', currentUrl.pathname + currentUrl.search);
        } else if (code) {
          // PKCE/code flow
          ({ data, error } = await supabase.auth.exchangeCodeForSession(window.location.href));
        } else {
          error = { message: 'No auth credentials found in URL' } as any;
        }

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          toast({
            title: "Authentication failed",
            description: error.message || "Failed to complete sign-in",
            variant: "destructive",
          });
          return;
        }

        if (data?.session) {
          setStatus('success');
          toast({ title: "Successfully signed in!", description: "Redirecting to your dashboard..." });
          setTimeout(() => navigate('/app'), 500);
        } else {
          setStatus('error');
          toast({ title: "Authentication failed", description: "No session found", variant: "destructive" });
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        toast({
          title: "Authentication failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-medium border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-12 h-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-12 h-12 text-destructive" />
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Completing sign-in...'}
            {status === 'success' && 'Welcome back!'}
            {status === 'error' && 'Sign-in failed'}
          </CardTitle>
          
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your magic link'}
            {status === 'success' && 'You have been successfully signed in'}
            {status === 'error' && 'There was a problem completing your sign-in'}
          </CardDescription>
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="text-center">
            <Link to="/sign-in">
              <Button className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;