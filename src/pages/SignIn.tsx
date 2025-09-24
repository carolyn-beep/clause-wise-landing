import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSigningIn(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
        navigate('/app');
      }
    } catch (err) {
      console.error("Unexpected sign in error:", err);
      const isNetworkError = err instanceof TypeError || 
                           (err as any)?.message?.toLowerCase().includes('network') ||
                           (err as any)?.message?.toLowerCase().includes('fetch');
      
      toast({
        title: "Network Connection Issue",
        description: isNetworkError 
          ? "Unable to connect to authentication server. Please ask your IT administrator to whitelist: https://fecwtquqfbgpawkmxzvz.supabase.co" 
          : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({ title: "Enter your email", description: "Add your email above first." });
      return;
    }
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast({ title: "Could not resend", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Confirmation email sent", description: "Check your inbox to confirm your email." });
      }
    } catch (err) {
      console.error("Unexpected resend error:", err);
      toast({ title: "Unexpected error", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      toast({ title: "Enter your email", description: "Add your email above first." });
      return;
    }
    setIsSendingLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast({ title: "Could not send magic link", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Magic link sent", description: "Check your email to sign in." });
      }
    } catch (err) {
      console.error("Unexpected magic link error:", err);
      toast({ title: "Unexpected error", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-smooth">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>

          <Card className="shadow-medium border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your ClauseWise account to continue reviewing contracts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email/Password Form */}
              <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSigningIn}
                    className="border-border focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSigningIn}
                    className="border-border focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSigningIn || !email || !password}
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleResendConfirmation}
                  disabled={isResending || !email}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending confirmation...
                    </>
                  ) : (
                    "Resend confirmation email"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleSendMagicLink}
                  disabled={isSendingLink || !email}
                >
                  {isSendingLink ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    "Email me a magic link"
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <div>
                  Don't have an account?{" "}
                  <Link to="/sign-up" className="text-primary hover:underline">
                    Sign up here
                  </Link>
                </div>
                <div>
                  <Link to="/demo" className="text-muted-foreground/70 hover:text-muted-foreground transition-smooth">
                    Just trying it out? Try the demo →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignIn;