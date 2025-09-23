import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <nav className="flex items-center justify-between py-6 px-4 md:px-6 lg:px-8">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
          ClauseWise
        </Link>
      </div>
      
      <div className="hidden md:flex items-center space-x-8">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">
          Home
        </Link>
        <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-smooth">
          Blog
        </Link>
        <Link to="/sign-in">
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
            Sign in
          </Button>
        </Link>
      </div>

      {/* Mobile menu button - simplified for now */}
      <div className="md:hidden">
        <Link to="/sign-in">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;