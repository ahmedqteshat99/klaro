import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { signupPasswordSchema } from "@/lib/validation";
import { z } from "zod";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
      }
    });

    // Also check if we already have a session (token was already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRecoveryReady(true);
      } else {
        // Give time for the recovery token to be exchanged
        timeout = setTimeout(() => {
          if (!recoveryReady) {
            setExpired(true);
          }
        }, 5000);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    try {
      signupPasswordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        newErrors.password = err.errors[0].message;
      }
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Die Passwörter stimmen nicht überein.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ variant: "destructive", title: "Fehler", description: error.message });
      } else {
        await supabase.auth.signOut();
        toast({
          title: "Passwort geändert",
          description: "Ihr Passwort wurde erfolgreich geändert. Bitte melden Sie sich an.",
          duration: 8000,
        });
        navigate("/auth", { replace: true });
      }
    } catch {
      toast({ variant: "destructive", title: "Fehler", description: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setIsLoading(false);
    }
  };

  // Expired / invalid link
  if (expired && !recoveryReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <Link to="/" className="flex items-center justify-center mb-10">
              <BrandLogo />
            </Link>
            <Card className="animate-fade-in shadow-apple-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl tracking-tight">Link ungültig</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-2 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                <p className="text-sm text-muted-foreground">
                  Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.
                  Bitte fordern Sie einen neuen Link an.
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

  // Loading / waiting for recovery token
  if (!recoveryReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Einen Moment bitte...</p>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-10">
            <BrandLogo />
          </Link>
          <Card className="animate-fade-in shadow-apple-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl tracking-tight">Neues Passwort festlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium">Passwort-Anforderungen:</p>
                  <ul className="space-y-0.5 pl-4">
                    <li className={password.length >= 12 ? "text-green-600" : ""}>
                      {password.length >= 12 ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "- "}
                      Mindestens 12 Zeichen
                    </li>
                    <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                      {/[A-Z]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "- "}
                      Ein Großbuchstabe
                    </li>
                    <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                      {/[a-z]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "- "}
                      Ein Kleinbuchstabe
                    </li>
                    <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                      {/[0-9]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "- "}
                      Eine Ziffer
                    </li>
                    <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}>
                      {/[^A-Za-z0-9]/.test(password) ? <CheckCircle2 className="inline h-3 w-3 mr-1" /> : "- "}
                      Ein Sonderzeichen
                    </li>
                  </ul>
                </div>

                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Passwort ändern
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
