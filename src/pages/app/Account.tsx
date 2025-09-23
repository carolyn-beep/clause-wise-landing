import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, LogOut, Trash2, Mail, Loader2 } from "lucide-react";

const Account = () => {
  const [userEmail, setUserEmail] = useState<string>("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate("/sign-in");
        return;
      }
      setUserEmail(user.email || "");
    };

    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error signing out",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred while signing out.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteData = async () => {
    setIsDeletingData(true);
    try {
      // Get the current session to use the JWT token
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        toast({
          title: "Authentication error",
          description: "Please sign in again to delete your data.",
          variant: "destructive",
        });
        navigate("/sign-in");
        return;
      }

      // Call the delete-user-data edge function
      const { error } = await supabase.functions.invoke('delete-user-data', {
        method: 'DELETE'
      });

      if (error) {
        console.error('Data deletion error:', error);
        toast({
          title: "Failed to delete data",
          description: error.message || "An error occurred while deleting your data.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Data deleted successfully",
        description: "All your contract data has been permanently deleted.",
      });
      
      // Navigate to upload page since history is now empty
      navigate("/app/upload");
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Something went wrong",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingData(false);
    }
  };
  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your profile and account preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Your email address is managed through authentication. To change it, please contact support.
              </p>
            </CardContent>
          </Card>

          {/* Delete Data Section */}
          <Card className="shadow-soft border-0 border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete My Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all your contract analyses, flags, and related data. 
                  This action cannot be undone.
                </p>
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Warning: This will delete all your contracts, analyses, and flags permanently.
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isDeletingData}
                    className="w-full sm:w-auto"
                  >
                    {isDeletingData ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting Data...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All My Data
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your 
                      contract data including analyses, flags, and related information.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete all my data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Sign Out Section */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="w-5 h-5" />
                Account Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Sign Out</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your ClauseWise account
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full sm:w-auto"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing Out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;