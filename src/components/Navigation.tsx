import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import clausewiseLogo from "@/assets/clausewise-logo.png";

const Navigation = () => {
  const { user, signOut } = useAuth();
  return (
    <nav className="flex items-center justify-between py-6 px-4 md:px-6 lg:px-8">
      <div className="flex items-center">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src={clausewiseLogo} 
            alt="ClauseWise" 
            className="w-8 h-8"
          />
          <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            ClauseWise
          </span>
        </Link>
      </div>
      
      <div className="hidden md:flex items-center space-x-8">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">
          Home
        </Link>
        <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-smooth">
          Blog
        </Link>
        {user ? (
          <div className="flex items-center space-x-4">
            <Link to="/app">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              Sign out
            </Button>
          </div>
        ) : (
          <Link to="/sign-in">
            <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
              Sign in
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile menu button - simplified for now */}
      <div className="md:hidden">
        {user ? (
          <div className="flex items-center space-x-2">
            <Link to="/app">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <Link to="/sign-in">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation;