import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { Mail, ArrowLeft } from "lucide-react";

const SignIn = () => {
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
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    className="border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                    className="border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </form>

              <div className="relative">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-3 text-sm text-muted-foreground">or</span>
                </div>
              </div>

              {/* Magic Link */}
              <Button variant="outline" className="w-full" size="lg">
                <Mail className="w-4 h-4 mr-2" />
                Send magic link
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/sign-in" className="text-primary hover:underline">
                  Sign up here
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignIn;