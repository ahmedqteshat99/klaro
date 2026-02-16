import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { ArrowLeft } from "lucide-react";

interface JobsNavBarProps {
  isAuthenticated: boolean;
  /** When set, shows a back button instead of the default nav links */
  backLink?: { to: string; label: string };
}

const JobsNavBar = ({ isAuthenticated, backLink }: JobsNavBarProps) => (
  <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
    <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
      <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3">
        <BrandLogo />
      </Link>
      <div className="flex items-center gap-2">
        {backLink ? (
          <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
            <Link to={backLink.to}>
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{backLink.label}</span>
            </Link>
          </Button>
        ) : isAuthenticated ? (
          <>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/inbox">Inbox</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
              <Link to="/auth">Registrieren</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  </nav>
);

export default JobsNavBar;
