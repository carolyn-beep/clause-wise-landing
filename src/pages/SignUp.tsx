import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [showSignInLink, setShowSignInLink] = useState(false);
  const { toast } = useToast();

  const handleEmailPasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSigningUp(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email to confirm",
          description: "We've sent you a confirmation link to complete your registration.",
        });
        setShowSignInLink(true);
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      toast({
        title: "Sign up failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleMagicLinkSignUp = async (e: React.FormEvent) => {
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

              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-3 text-sm text-muted-foreground">or</span>
                </div>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLinkSignUp} className="space-y-4">
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