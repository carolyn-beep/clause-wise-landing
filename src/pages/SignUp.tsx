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

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSignInLink, setShowSignInLink] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailPasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sign up form submitted", { email, password: "***" });
    
    if (!email || !password) {
      console.log("Missing email or password");
      return;
    }

    setIsSigningUp(true);
    
    try {
      console.log("Calling supabase.auth.signUp with redirect:", `${window.location.origin}/auth/callback`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://clausewise-ai.com/auth/callback'
        }
      });

      console.log("Supabase signUp response:", { data, error });

      if (error) {
        console.error("Sign up error:", error);
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("Sign up successful, attempting auto sign-in");
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast({
            title: "Account created",
            description:
              "Please sign in to continue. If email confirmation is required, confirm your email or ask the admin to disable confirmations for testing.",
          });
          setShowSignInLink(true);
        } else {
          toast({
            title: "Welcome!",
            description: "Your account has been created and you are now signed in.",
          });
          navigate('/app');
        }
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      console.error("Unexpected sign up error:", err);
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
      setIsSigningUp(false);
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
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>
                Get started with ClauseWise to review contracts with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email/Password Form */}
              <form onSubmit={handleEmailPasswordSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input 
                    id="signup-email"
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSigningUp}
                    className="border-border focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input 
                    id="signup-password"
                    type="password" 
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSigningUp}
                    className="border-border focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={isSigningUp || !email || !password}
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>


              <div className="text-center text-sm text-muted-foreground space-y-2">
                <div>
                  Already have an account?{" "}
                  <Link to="/sign-in" className="text-primary hover:underline">
                    Sign in here
                  </Link>
                </div>
                {showSignInLink && (
                  <div>
                    <Link to="/sign-in" className="text-primary hover:underline font-medium">
                      Confirmed your email? Sign in now →
                    </Link>
                  </div>
                )}
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

export default SignUp;