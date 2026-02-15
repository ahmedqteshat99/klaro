import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AuthorizedRouteProps {
  children: React.ReactNode;
}

// Authorized email addresses
const AUTHORIZED_EMAILS = [
  "ahmedqteshat99@icloud.com"
];

const AuthorizedRoute = ({ children }: AuthorizedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
          setIsAuthorized(false);
          setIsChecking(false);
          return;
        }

        // Check if user's email is in the authorized list
        const authorized = AUTHORIZED_EMAILS.some(
          (email) => email.toLowerCase() === user.email?.toLowerCase()
        );

        setIsAuthorized(authorized);
      } catch (error) {
        console.error("Authorization check error:", error);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthorization();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/coming-soon" replace />;
  }

  return <>{children}</>;
};

export default AuthorizedRoute;
