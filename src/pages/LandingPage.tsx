import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { rememberCtaClick } from "@/lib/attribution";
import {
  getLandingHeroCtaConfig,
  LANDING_HERO_CTA_EXPERIMENT_ID,
} from "@/lib/experiments";
import AppFooter from "@/components/AppFooter";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import BrandLogo from "@/components/BrandLogo";
import useScrollAnimation from "@/hooks/useScrollAnimation";
import { FileText, Download, Shield, CheckCircle, ArrowRight, PenTool, Users, Star, Building2 } from "lucide-react";

// Scroll animation wrapper component
const ScrollSection = ({
  children,
  className = "",
  animation = "scroll-fade-in"
}: {
  children: React.ReactNode;
  className?: string;
  animation?: string;
}) => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div ref={ref} className={`${animation} ${isVisible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
};

const LandingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showDeletedNotice, setShowDeletedNotice] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const landingHeroCta = useMemo(() => getLandingHeroCtaConfig(), []);

  useEffect(() => {
    const state = location.state as { accountDeleted?: boolean } | null;
    if (state?.accountDeleted) {
      setShowDeletedNotice(true);
    }
  }, [location.state]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Animate user count
  useEffect(() => {
    const target = 500;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setUserCount(target);
        clearInterval(timer);
      } else {
        setUserCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <FileText className="h-7 w-7" />,
      title: "Lebenslauf im Klinik-Standard",
      description: "Klar. Strukturiert.",
    },
    {
      icon: <PenTool className="h-7 w-7" />,
      title: "Anschreiben im richtigen Ton",
      description: "Ohne Floskeln.",
    },
    {
      icon: <Download className="h-7 w-7" />,
      title: "PDF & DOCX",
      description: "Direkt exportieren.",
    },
  ];

  const reasons = [
    "Deutsch ist nicht immer die Muttersprache.",
    "Struktur im deutschen Lebenslauf ist oft unklar.",
    "Anschreiben wirken schnell generisch.",
  ];

  const steps = [
    {
      title: "Profil ausfüllen",
      description: "Erfahrung, Ausbildung, Zertifikate.",
    },
    {
      title: "Generieren",
      description: "Lebenslauf & Anschreiben.",
    },
    {
      title: "Speichern & Exportieren",
      description: "Versionen, PDF, DOCX.",
    },
  ];

  const trustPoints = [
    "Nur Sie haben Zugriff.",
    "Jederzeit löschen.",
    "Keine Werbung, kein Tracking.",
  ];

  const testimonials = [
    {
      quote: "Endlich ein Anschreiben, das nicht wie eine Vorlage klingt.",
      name: "Dr. M. Yilmaz",
      role: "Assistenzärztin, Kardiologie",
    },
    {
      quote: "Innerhalb von 10 Minuten war mein Lebenslauf fertig.",
      name: "Dr. A. Petrov",
      role: "Assistenzarzt, Chirurgie",
    },
  ];

  const rememberLandingCta = (source: string, destination: string) => {
    rememberCtaClick({
      source,
      destination,
      experimentId: LANDING_HERO_CTA_EXPERIMENT_ID,
      variant: landingHeroCta.variant,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex items-center gap-6">
              <Link to="/datenschutz" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Datenschutz
              </Link>
              <Link to="/impressum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Impressum
              </Link>
            </div>
            <Button asChild size="sm">
              <Link to="/auth">Anmelden</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Gradient */}
      <section className="hero-gradient pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-32">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            {showDeletedNotice && (
              <Alert className="mb-6 text-left">
                <AlertTitle>Konto gelöscht</AlertTitle>
                <AlertDescription>
                  Ihr Konto und alle gespeicherten Daten wurden erfolgreich entfernt.
                </AlertDescription>
              </Alert>
            )}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Shield className="h-4 w-4" />
              Privates MVP
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tighter animate-fade-in">
              {landingHeroCta.heroTitlePrimary}
              <br />
              <span className="text-primary">{landingHeroCta.heroTitleAccent}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in">
              {landingHeroCta.heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Button asChild size="lg" className="text-base px-8 h-14 rounded-2xl shadow-apple-lg hover-lift">
                {landingHeroCta.heroPrimaryTo.startsWith("#") ? (
                  <a
                    href={landingHeroCta.heroPrimaryTo}
                    onClick={() =>
                      rememberLandingCta("landing_hero_primary", landingHeroCta.heroPrimaryTo)
                    }
                  >
                    {landingHeroCta.heroPrimaryLabel}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                ) : (
                  <Link
                    to={landingHeroCta.heroPrimaryTo}
                    onClick={() =>
                      rememberLandingCta("landing_hero_primary", landingHeroCta.heroPrimaryTo)
                    }
                  >
                    {landingHeroCta.heroPrimaryLabel}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                )}
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-14 rounded-2xl">
                {landingHeroCta.heroSecondaryTo.startsWith("#") ? (
                  <a
                    href={landingHeroCta.heroSecondaryTo}
                    onClick={() =>
                      rememberLandingCta("landing_hero_secondary", landingHeroCta.heroSecondaryTo)
                    }
                  >
                    {landingHeroCta.heroSecondaryLabel}
                  </a>
                ) : (
                  <Link
                    to={landingHeroCta.heroSecondaryTo}
                    onClick={() =>
                      rememberLandingCta("landing_hero_secondary", landingHeroCta.heroSecondaryTo)
                    }
                  >
                    {landingHeroCta.heroSecondaryLabel}
                  </Link>
                )}
              </Button>
            </div>
            <DisclaimerBanner className="mt-8 max-w-2xl mx-auto text-left" />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground counter-animate">{userCount}+</div>
                  <div className="text-sm text-muted-foreground">Ärzte vertrauen Klaro</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">4.9</div>
                  <div className="text-sm text-muted-foreground">Durchschnittliche Bewertung</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">100+</div>
                  <div className="text-sm text-muted-foreground">Kliniken erreicht</div>
                </div>
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* Problem / Brand Story Section */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Warum Klaro?
              </h2>
              <p className="text-lg text-muted-foreground">
                Struktur und Ton – ohne erfundene Fakten.
              </p>
            </ScrollSection>
            <div className="space-y-4">
              {reasons.map((reason, index) => (
                <ScrollSection key={index} className="stagger-children">
                  <div className="flex items-center gap-5 p-5 rounded-2xl glass-card-strong hover-lift">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-foreground font-medium">{reason}</span>
                  </div>
                </ScrollSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Was Ärzte sagen
            </h2>
          </ScrollSection>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <ScrollSection key={index}>
                <Card className="glass-card-strong hover-lift h-full">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-lg text-foreground mb-6 italic">
                      "{testimonial.quote}"
                    </p>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Beispiele
            </h2>
            <p className="text-lg text-muted-foreground">
              Fiktive Daten, reale Struktur.
            </p>
          </ScrollSection>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <ScrollSection animation="scroll-fade-in-left">
              <div className="rounded-2xl border border-border/60 bg-card shadow-apple-xl overflow-hidden hover-lift">
                <div className="px-5 py-3 border-b border-border/60 text-sm text-muted-foreground">
                  Beispiel Lebenslauf
                </div>
                <div className="p-6 text-sm leading-relaxed text-foreground space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">Dr. Lara König</div>
                      <div className="text-muted-foreground">Assistenzärztin – Innere Medizin</div>
                    </div>
                    <div className="text-right text-muted-foreground text-xs">
                      Berlin
                      <br />
                      +49 151 23456789
                      <br />
                      lara.koenig@example.com
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Approbation: 06/2022 • Berufserfahrung: 2+ Jahre
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Profil</div>
                    <p className="text-muted-foreground">
                      Strukturierte Assistenzärztin mit klinischer Erfahrung in Notaufnahme, Station und
                      Funktionsdiagnostik. Schwerpunkte: Innere Medizin, Kardiologie, Diabetologie.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Berufserfahrung</div>
                    <div className="flex justify-between text-sm">
                      <span>Charité – Klinik für Innere Medizin</span>
                      <span className="text-muted-foreground">08/2022–heute</span>
                    </div>
                    <ul className="text-muted-foreground text-xs mt-1 list-disc pl-4 space-y-1">
                      <li>Stationsarbeit, Aufnahme, Visiten, Entlassbriefe</li>
                      <li>EKG, Sonographie-Basis, Laborinterpretation</li>
                      <li>Interdisziplinäre Fallbesprechungen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in-right">
              <div className="rounded-2xl border border-border/60 bg-card shadow-apple-xl overflow-hidden hover-lift">
                <div className="px-5 py-3 border-b border-border/60 text-sm text-muted-foreground">
                  Beispiel Anschreiben
                </div>
                <div className="p-6 text-sm leading-relaxed text-foreground space-y-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      Dr. Lara König
                      <br />
                      Berlin
                      <br />
                      lara.koenig@example.com
                    </div>
                    <div className="text-right">
                      Städtisches Klinikum
                      <br />
                      Klinik für Innere Medizin
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">01.02.2026</div>
                  <p className="font-semibold">Betreff: Bewerbung als Assistenzärztin (Innere Medizin)</p>
                  <p>
                    Sehr geehrte Damen und Herren,
                  </p>
                  <p className="text-muted-foreground">
                    mit großem Interesse bewerbe ich mich um die Position in Ihrer Klinik. In den
                    vergangenen zwei Jahren konnte ich in der Inneren Medizin und in der Notaufnahme
                    strukturierte klinische Abläufe, sichere Dokumentation und teamorientierte Zusammenarbeit
                    festigen.
                  </p>
                  <p className="text-muted-foreground">
                    Gern möchte ich mich fachlich weiterentwickeln, Verantwortung übernehmen und Ihr Team
                    langfristig unterstützen.
                  </p>
                  <p>Mit freundlichen Grüßen</p>
                  <p className="text-muted-foreground">Dr. Lara König</p>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="so-funktionierts" className="py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              So funktioniert&apos;s
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Drei Schritte.
            </p>
          </ScrollSection>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 items-center">
            {steps.map((step, index) => (
              <div key={step.title} className="contents">
                <ScrollSection>
                  <Card className="hover-lift glass-card-strong">
                    <CardContent className="p-8">
                      <div className="text-sm text-muted-foreground mb-3">Schritt {index + 1}</div>
                      <h3 className="text-lg font-semibold text-card-foreground mb-3 tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </ScrollSection>
                {index < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full border border-border/60 bg-background flex items-center justify-center shadow-apple float">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Claude AI Transparency Section */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <ScrollSection>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                    Texterstellung mit moderner KI
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Claude Sonnet 4.5 erstellt Texte nur aus Ihren Angaben.
                  </p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-card-strong float-delayed">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <img
                        src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/claude-color.png"
                        alt="Claude"
                        className="h-6 w-6"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">Claude</div>
                      <div className="text-xs text-muted-foreground">Sonnet 4.5</div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Funktionen, die wirklich helfen
            </h2>
          </ScrollSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <ScrollSection key={index}>
                <Card className="hover-lift glass-card-strong w-full max-w-sm">
                  <CardContent className="p-8 flex flex-col">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-3 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Privacy Section */}
      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Ihre Daten bleiben Ihre Daten
              </h2>
            </ScrollSection>
            <div className="space-y-4">
              {trustPoints.map((point, index) => (
                <ScrollSection key={index}>
                  <div className="flex items-center gap-5 p-5 rounded-2xl glass-card-strong hover-lift">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-foreground font-medium">{point}</span>
                  </div>
                </ScrollSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection animation="scroll-scale-in">
            <div className="max-w-4xl mx-auto rounded-3xl gradient-primary p-12 md:p-16 text-center shadow-apple-xl">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 tracking-tight">
                {landingHeroCta.finalCtaTitle}
              </h2>
              <Button asChild size="lg" variant="secondary" className="text-base px-8 h-14 rounded-2xl shadow-apple-lg hover-lift">
                <Link
                  to={landingHeroCta.finalCtaTo}
                  onClick={() => rememberLandingCta("landing_bottom_cta", landingHeroCta.finalCtaTo)}
                >
                  {landingHeroCta.finalCtaLabel}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </ScrollSection>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default LandingPage;
