import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const email = (location.state as { email?: string })?.email;

  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const handleVerified = useCallback(() => {
    setVerified(true);
    setTimeout(() => {
      navigate("/onboarding", { replace: true });
    }, 1500);
  }, [navigate]);

  // Check if already verified on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        handleVerified();
      }
    });
  }, [handleVerified]);

  // Listen for auth state changes (email confirmation)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" &&
          session?.user?.email_confirmed_at
        ) {
          handleVerified();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [handleVerified]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: error.message,
        });
      } else {
        toast({
          title: "E-Mail gesendet",
          description: "Eine neue Bestätigungs-E-Mail wurde gesendet.",
        });
        setResendCooldown(RESEND_COOLDOWN);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Verified state - brief success before redirect
  if (verified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 animate-fade-in" />
            <h2 className="text-2xl font-semibold tracking-tight">
              E-Mail bestätigt!
            </h2>
            <p className="text-muted-foreground">
              Sie werden zum Onboarding weitergeleitet...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No email in state - fallback
  if (!email) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <Link to="/" className="flex items-center justify-center mb-10">
              <BrandLogo />
            </Link>
            <Card className="animate-fade-in shadow-apple-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl tracking-tight">
                  E-Mail-Bestätigung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-2 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Bitte überprüfen Sie Ihr E-Mail-Postfach und klicken Sie auf
                  den Bestätigungslink.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Zurück zur Anmeldung</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <AppFooter />
      </div>
    );
  }

  // Main verification waiting state
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-10">
            <BrandLogo />
          </Link>
          <Card className="animate-fade-in shadow-apple-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl tracking-tight">
                E-Mail bestätigen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2 text-center">
              <Mail className="h-12 w-12 mx-auto text-primary" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Wir haben eine Bestätigungs-E-Mail an
                </p>
                <p className="font-medium text-foreground">{email}</p>
                <p className="text-sm text-muted-foreground">
                  gesendet. Bitte klicken Sie auf den Link in der E-Mail, um Ihr
                  Konto zu aktivieren.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                >
                  {isResending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {resendCooldown > 0
                    ? `Erneut senden (${resendCooldown}s)`
                    : "Erneut senden"}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Keine E-Mail erhalten? Prüfen Sie Ihren Spam-Ordner oder{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    className="text-primary underline hover:text-primary/80 disabled:opacity-50 disabled:no-underline"
                  >
                    fordern Sie eine neue E-Mail an
                  </button>
                  .
                </p>
              </div>

              <div className="pt-2 border-t">
                <Button variant="ghost" asChild className="w-full text-sm">
                  <Link to="/auth">Zurück zur Anmeldung</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
