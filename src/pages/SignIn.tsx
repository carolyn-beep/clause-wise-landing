import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
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
      toast({
        title: "Sign in failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail) return;

    setIsSendingMagicLink(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          title: "Failed to send magic link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Magic link sent",
          description: "Check your email for the magic sign-in link.",
        });
        setMagicEmail("");
      }
    } catch (err) {
      toast({
        title: "Failed to send magic link",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSendingMagicLink(false);
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

              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-3 text-sm text-muted-foreground">or</span>
                </div>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email for magic link</Label>
                  <Input 
                    id="magic-email"
                    type="email" 
                    placeholder="Enter your email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    disabled={isSendingMagicLink}
                    className="border-border focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  disabled={isSendingMagicLink || !magicEmail}
                >
                  {isSendingMagicLink ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send magic link
                    </>
                  )}
                </Button>
              </form>

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