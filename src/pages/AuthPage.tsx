import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingDone, checkOnboardingFromDB } from "@/pages/OnboardingPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { z } from "zod";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";
import { logEvent, touchLastSeen } from "@/lib/app-events";
import { getAttributionMeta } from "@/lib/attribution";
import { sanitizeNextPath, withNextParam } from "@/lib/navigation-intent";

// Validation schemas
const emailSchema = z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
// Keep login permissive so legacy users can still sign in with older passwords.
// Enforce strong passwords only for new sign-ups.
const loginPasswordSchema = z.string().min(6, "Das Passwort muss mindestens 6 Zeichen haben.");
const signupPasswordSchema = z.string()
  .min(12, "Das Passwort muss mindestens 12 Zeichen haben.")
  .regex(/[A-Z]/, "Das Passwort muss mindestens einen Großbuchstaben enthalten.")
  .regex(/[a-z]/, "Das Passwort muss mindestens einen Kleinbuchstaben enthalten.")
  .regex(/[0-9]/, "Das Passwort muss mindestens eine Ziffer enthalten.")
  .regex(/[^A-Za-z0-9]/, "Das Passwort muss mindestens ein Sonderzeichen enthalten.");
const nameSchema = z.string().min(2, "Der Name muss mindestens 2 Zeichen haben.");

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [dsgvoConsent, setDsgvoConsent] = useState(false);
  const [medicalDataConsent, setMedicalDataConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const nextPath = useMemo(
    () => sanitizeNextPath(new URLSearchParams(location.search).get("next")),
    [location.search]
  );
  const postAuthTarget = nextPath ?? "/dashboard";
  const onboardingTarget = withNextParam("/onboarding", nextPath);

  const envSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  const appBaseUrl =
    envSiteUrl && envSiteUrl.trim().length > 0
      ? envSiteUrl.trim().replace(/\/+$/, "")
      : window.location.origin;
  const authRedirectUrl = withNextParam(`${appBaseUrl}/auth`, nextPath);

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await logEvent("login", getAttributionMeta() ?? undefined, session.user.id);
        await touchLastSeen(session.user.id);
      }

      if (event === "SIGNED_UP" && session?.user) {
        await logEvent("signup", getAttributionMeta() ?? undefined, session.user.id);
        await touchLastSeen(session.user.id);
      }

      if (session) {
        const userId = session.user.id;
        if (isOnboardingDone(userId)) {
          navigate(postAuthTarget, { replace: true });
        } else {
          const done = await checkOnboardingFromDB(userId);
          navigate(done ? postAuthTarget : onboardingTarget, { replace: true });
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userId = session.user.id;
        if (isOnboardingDone(userId)) {
          navigate(postAuthTarget, { replace: true });
        } else {
          const done = await checkOnboardingFromDB(userId);
          navigate(done ? postAuthTarget : onboardingTarget, { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, onboardingTarget, postAuthTarget]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      (isLogin ? loginPasswordSchema : signupPasswordSchema).parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin) {
      try {
        nameSchema.parse(vorname);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.vorname = e.errors[0].message;
        }
      }

      try {
        nameSchema.parse(nachname);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.nachname = e.errors[0].message;
        }
      }

      if (!dsgvoConsent) {
        newErrors.dsgvo = "Sie müssen den Bedingungen zustimmen.";
      }

      if (!medicalDataConsent) {
        newErrors.medicalData = "Sie müssen der Verarbeitung Ihrer medizinischen Berufsdaten zustimmen.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Anmeldung fehlgeschlagen",
              description: "E-Mail oder Passwort ist falsch.",
              variant: "destructive",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              title: "E-Mail nicht bestätigt",
              description: "Bitte bestätigen Sie Ihre E-Mail-Adresse.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Fehler",
              description: error.message,
              variant: "destructive",
            });
          }
        } else if (session?.user && !session.user.email_confirmed_at) {
          // Check if email is verified (additional security check)
          toast({
            variant: "destructive",
            title: "E-Mail nicht bestätigt",
            description: "Bitte bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden. Prüfen Sie Ihren Posteingang.",
            duration: 8000,
          });
          await supabase.auth.signOut(); // Force logout
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              vorname,
              nachname,
              dsgvo_consent: dsgvoConsent,
              dsgvo_consent_date: new Date().toISOString(),
              consentAt: new Date().toISOString(),
              medical_data_consent: medicalDataConsent,
              medical_data_consent_date: new Date().toISOString(),
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Registrierung fehlgeschlagen",
              description: "Diese E-Mail-Adresse ist bereits registriert.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Fehler",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // ALWAYS require email verification (don't check data.session)
          toast({
            title: "Registrierung erfolgreich!",
            description: "Bitte prüfen Sie Ihre E-Mails und bestätigen Sie Ihre Adresse, bevor Sie sich anmelden.",
            duration: 10000,
          });
          // Redirect to login page (not auto-login)
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authRedirectUrl,
        },
      });

      if (error) {
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Google-Anmeldung fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center mb-10">
            <BrandLogo />
          </Link>

          <Card className="animate-fade-in shadow-apple-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl tracking-tight">
                {isLogin ? "Willkommen zurück" : "Konto erstellen"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {/* OAuth Buttons */}
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full h-12"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">oder</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {!isLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vorname">Vorname</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="vorname"
                          placeholder="Max"
                          value={vorname}
                          onChange={(e) => setVorname(e.target.value)}
                          className="pl-11"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.vorname && (
                        <p className="text-sm text-destructive">{errors.vorname}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nachname">Nachname</Label>
                      <Input
                        id="nachname"
                        placeholder="Mustermann"
                        value={nachname}
                        onChange={(e) => setNachname(e.target.value)}
                        disabled={isLoading}
                      />
                      {errors.nachname && (
                        <p className="text-sm text-destructive">{errors.nachname}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
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
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="dsgvo"
                          checked={dsgvoConsent}
                          onCheckedChange={(checked) => setDsgvoConsent(checked as boolean)}
                          disabled={isLoading}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor="dsgvo"
                          className="text-sm text-muted-foreground leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Ich habe die{" "}
                          <Link to="/datenschutz" className="text-primary hover:underline" target="_blank">
                            Datenschutzerklärung
                          </Link>{" "}
                          und{" "}
                          <Link to="/agb" className="text-primary hover:underline" target="_blank">
                            AGB
                          </Link>{" "}
                          gelesen und stimme diesen zu.
                        </label>
                      </div>
                      {errors.dsgvo && (
                        <p className="text-sm text-destructive">{errors.dsgvo}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="medical-data"
                          checked={medicalDataConsent}
                          onCheckedChange={(checked) => setMedicalDataConsent(checked as boolean)}
                          disabled={isLoading}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor="medical-data"
                          className="text-sm text-muted-foreground leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Ich willige <strong>ausdrücklich</strong> ein, dass meine medizinischen Berufsdaten
                          zur Erstellung meiner Bewerbungsunterlagen verarbeitet werden (DSGVO Art. 9).
                        </label>
                      </div>
                      {errors.medicalData && (
                        <p className="text-sm text-destructive">{errors.medicalData}</p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Privates MVP. Daten nur für Lebenslauf/Anschreiben.
                    </p>
                  </>
                )}

                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "Anmelden" : "Registrieren"}
                </Button>
              </form>

              {isLogin && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        toast({
                          title: "E-Mail-Adresse erforderlich",
                          description: "Bitte geben Sie Ihre E-Mail-Adresse ein.",
                          variant: "destructive"
                        });
                        return;
                      }
                      const { error } = await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                      });
                      if (error) {
                        toast({
                          variant: "destructive",
                          title: "Fehler",
                          description: error.message
                        });
                      } else {
                        toast({
                          title: "Bestätigungs-E-Mail erneut gesendet",
                          description: "Prüfen Sie Ihren Posteingang."
                        });
                      }
                    }}
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Bestätigungs-E-Mail erneut senden
                  </button>
                </div>
              )}

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}
                </span>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  {isLogin ? "Jetzt registrieren" : "Anmelden"}
                </button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default AuthPage;
