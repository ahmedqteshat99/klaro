import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { rememberCtaClick } from "@/lib/attribution";
import {
  getLandingHeroCtaConfig,
  LANDING_HERO_CTA_EXPERIMENT_ID,
} from "@/lib/experiments";
import AppFooter from "@/components/AppFooter";
import BrandLogo from "@/components/BrandLogo";
import useScrollAnimation from "@/hooks/useScrollAnimation";
import CvMockup from "@/components/landing/CvMockup";
import CoverLetterMockup from "@/components/landing/CoverLetterMockup";
import AnimatedHeroBackground from "@/components/landing/AnimatedHeroBackground";
import { PrepareIllustration, ApplyIllustration, ConvinceIllustration } from "@/components/landing/StepIllustrations";
import {
  FileText,
  Download,
  Shield,
  CheckCircle,
  ArrowRight,
  PenTool,
  Users,
  Star,
  Building2,
  Search,
  Zap,
  Layout,
  Globe,
  Lock,
  Mail,
  Briefcase,
  Target,
  TrendingUp,
  MessageSquare,
  ChevronRight
} from "lucide-react";

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

const NewLandingPage = () => {
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
    const target = 2847;
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

  const rememberLandingCta = (source: string, destination: string) => {
    rememberCtaClick({
      source,
      destination,
      experimentId: LANDING_HERO_CTA_EXPERIMENT_ID,
      variant: landingHeroCta.variant,
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="glass-nav-premium fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
          </div>


          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors mr-2">Anmelden</Link>
            <Button asChild size="sm" className="rounded-full px-6 shadow-soft-glow hover-lift">
              <Link to="/auth">Jetzt starten</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden mesh-gradient">
        <AnimatedHeroBackground />

        <div className="container relative mx-auto px-4 sm:px-6 z-10">
          <div className="max-w-5xl mx-auto text-center">
            {showDeletedNotice && (
              <Alert className="mb-6 text-left max-w-2xl mx-auto">
                <AlertTitle>Konto gelöscht</AlertTitle>
                <AlertDescription>
                  Ihr Konto und alle gespeicherten Daten wurden erfolgreich entfernt.
                </AlertDescription>
              </Alert>
            )}

            <ScrollSection animation="scroll-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/40 shadow-sm text-sm font-medium mb-8">
                <div className="flex -space-x-2 mr-2">
                  {[1, 2, 3, 4].map(i => (
                    <img
                      key={i}
                      src={`/images/avatar-${i}.svg`}
                      alt={`Doctor ${i}`}
                      className="h-6 w-6 rounded-full border-2 border-white"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-yellow-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                  </div>
                  <span className="text-slate-700 font-semibold">Vertraut von {userCount.toLocaleString("de-DE")} Ärzten</span>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-100">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 tracking-tighter leading-[1.1] md:leading-[1.05]">
                Schluss mit wochenlangem Bewerben<br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Starten Sie innerhalb von Tagen
                </span><br />
                mit Vorstellungsgesprächen
              </h1>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-200">
              <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Klaro findet passende Klinikstellen, erstellt professionelle Lebensläufe & Anschreiben,
                und bereitet eine fertige E-Mail-Bewerbung vor – Sie müssen nur noch auf "Senden" klicken.
                Komplett kostenlos für alle Ärzte.
              </p>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-300">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <Button asChild size="lg" className="text-base px-12 h-16 rounded-full shadow-soft-glow hover-lift bg-primary hover:bg-primary/90 text-white font-semibold">
                  <Link
                    to="/auth"
                    onClick={() => rememberLandingCta("landing_hero_primary", "/auth")}
                  >
                    Jetzt kostenlos starten
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base px-12 h-16 rounded-full hover-lift font-semibold border-2">
                  <Link to="/#funktionen">
                    Demo ansehen
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  100% kostenlos
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Keine Kreditkarte erforderlich
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>


      {/* Document Showcases Section */}
      <section className="py-24 bg-gradient-to-b from-white to-slate-50/50" id="leistungen">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">

            {/* Optimized CV Showcase */}
            <ScrollSection className="mb-20">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                    <CheckCircle className="h-4 w-4" />
                    99,8% ATS-kompatibel
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                    Optimierter Lebenslauf
                  </h2>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                    Tabellarischer deutscher Lebenslauf nach medizinischem Standard.
                    Mit Foto (oben rechts), Unterschrift (unten) und allen erforderlichen
                    Abschnitten für Ihre Krankenhausbewerbung.
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Berufserfahrung mit klinischen Stationen",
                      "Weiterbildungen & Zertifikate",
                      "Sprachkenntnisse (Deutsch C1, Englisch B2)",
                      "Unterschrift & Foto automatisch platziert"
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg" className="rounded-full px-8 hover-lift">
                    <Link to="/auth">Lebenslauf erstellen</Link>
                  </Button>
                </div>
                <div className="order-1 md:order-2">
                  <div className="glass-card-premium p-3 rounded-[2rem] bg-white shadow-apple-xl">
                    <div className="bg-white rounded-[1.7rem] p-8 border border-slate-100 aspect-[210/297]">
                      {/* CV Preview */}
                      <CvMockup />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollSection>

            {/* Optimized Cover Letter Showcase */}
            <ScrollSection className="mb-20">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="glass-card-premium p-3 rounded-[2rem] bg-white shadow-apple-xl">
                    <div className="bg-slate-50 rounded-[1.7rem] p-8 aspect-[210/297]">
                      {/* Cover Letter Preview */}
                      <CoverLetterMockup />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                    <CheckCircle className="h-4 w-4" />
                    99,8% Übereinstimmung
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                    Optimiertes Anschreiben
                  </h2>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                    Professionell formulierte Anschreiben nach deutschem Business-Standard.
                    Personalisiert auf jedes Krankenhaus und jede Stellenausschreibung.
                  </p>
                  <ul className="space-y-4 mb-8">
                    {[
                      "Anrede nach Titel (Prof. Dr., Herr/Frau)",
                      "Bezug auf Stellenanforderungen",
                      "Medizinische Fachterminologie",
                      "Formale deutsche Struktur"
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg" className="rounded-full px-8 hover-lift">
                    <Link to="/auth">Anschreiben generieren</Link>
                  </Button>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* Key Metric Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <ScrollSection animation="scroll-scale-in">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Ärzte mit Klaro erhalten 80% schneller eine Zusage
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Im Durchschnitt erhalten unsere Nutzer innerhalb von 14 Tagen
              eine Einladung zum Vorstellungsgespräch
            </p>
          </ScrollSection>
        </div>
      </section>

      {/* Three-Step Process Section */}
      <section className="py-24 bg-slate-50/50" id="funktionen">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                So funktioniert Klaro
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Drei einfache Schritte zu Ihrer erfolgreichen Krankenhausbewerbung
              </p>
            </ScrollSection>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  icon: <FileText className="h-8 w-8" />,
                  title: "Vorbereiten",
                  subtitle: "Professionelle Unterlagen in Minuten",
                  description: "Generieren Sie automatisch optimierte Lebensläufe und Anschreiben für jede Klinikstelle, basierend auf Ihrer Berufserfahrung, Approbation und Fachrichtung.",
                  features: [
                    "Tabellarischer deutscher Lebenslauf",
                    "Personalisiertes Anschreiben pro Stelle",
                    "Foto & Unterschrift automatisch platziert"
                  ]
                },
                {
                  step: "2",
                  icon: <Mail className="h-8 w-8" />,
                  title: "Bewerben",
                  subtitle: "Bewerbungs-Vorbereitung",
                  description: "Klaro durchsucht täglich tausende Stellenausschreibungen, findet perfekt passende Assistenzarzt-Positionen und bereitet eine fertige E-Mail mit allen Unterlagen vor – Sie versenden sie selbst.",
                  features: [
                    "Intelligente Stellensuche nach Fachrichtung",
                    "Fertige E-Mail-Vorlage mit Anhängen",
                    "Bewerbungsstatus selbst verwalten"
                  ],
                  metric: "12.500+ Klinikstellen durchsucht"
                },
                {
                  step: "3",
                  icon: <MessageSquare className="h-8 w-8" />,
                  title: "Überzeugen",
                  subtitle: "Bald verfügbar: Interview-Training",
                  description: "Demnächst: Trainieren Sie mit unserer KI für Ihr Vorstellungsgespräch. Simulieren Sie typische Fragen von Chefärzten und erhalten Sie Echtzeit-Feedback.",
                  features: [
                    "Krankenhaus-spezifische Fragen (in Entwicklung)",
                    "Live-Feedback zu Ihren Antworten (in Entwicklung)",
                    "Fachbereichs-spezifisches Training (in Entwicklung)"
                  ],
                  comingSoon: true
                }
              ].map((step, index) => (
                <ScrollSection key={index} className={`delay-${index * 100}`}>
                  <div className={`glass-card-premium p-8 rounded-[2rem] bg-white h-full ${step.comingSoon ? 'opacity-75' : ''}`}>
                    {/* Illustration */}
                    <div className="w-full h-48 mb-6">
                      {step.step === "1" && <PrepareIllustration />}
                      {step.step === "2" && <ApplyIllustration />}
                      {step.step === "3" && <ConvinceIllustration />}
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        {step.icon}
                      </div>
                      <div className="text-5xl font-black text-slate-100">{step.step}</div>
                    </div>
                    {step.comingSoon && (
                      <div className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold inline-block mb-3">
                        DEMNÄCHST VERFÜGBAR
                      </div>
                    )}
                    <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                    <p className="text-sm font-semibold text-primary mb-4">{step.subtitle}</p>
                    {step.metric && (
                      <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold inline-block mb-4">
                        {step.metric}
                      </div>
                    )}
                    {step.rating && (
                      <div className="px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold inline-block mb-4">
                        {step.rating}
                      </div>
                    )}
                    <p className="text-slate-600 mb-6 leading-relaxed">{step.description}</p>
                    <ul className="space-y-2 mb-6">
                      {step.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {step.testimonial && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs italic text-slate-600 mb-2">"{step.testimonial.quote}"</p>
                        <p className="text-xs font-semibold text-slate-800">{step.testimonial.author}</p>
                      </div>
                    )}
                    <Button asChild className="w-full mt-6 rounded-full hover-lift" disabled={step.comingSoon}>
                      <Link to={step.comingSoon ? "#" : "/auth"}>
                        {step.step === "1" && "Jetzt erstellen"}
                        {step.step === "2" && "Stellen durchsuchen"}
                        {step.step === "3" && "Bald verfügbar"}
                      </Link>
                    </Button>
                  </div>
                </ScrollSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                Alles, was Sie für Ihre erfolgreiche Bewerbung brauchen
              </h2>
            </ScrollSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <FileText className="h-6 w-6" />,
                  title: "Lebenslauf-Optimierung",
                  description: "Erstellen Sie einen ATS-optimierten deutschen Lebenslauf, der perfekt auf jede Klinikstelle zugeschnitten ist."
                },
                {
                  icon: <PenTool className="h-6 w-6" />,
                  title: "Anschreiben-Generator",
                  description: "Generieren Sie in Sekunden ein maßgeschneidertes Anschreiben für jedes Krankenhaus."
                },
                {
                  icon: <Layout className="h-6 w-6" />,
                  title: "Bewerbungs-Tracker",
                  description: "Verwalten Sie alle Ihre Bewerbungen zentral. Sehen Sie auf einen Blick den Status jeder Bewerbung."
                },
                {
                  icon: <MessageSquare className="h-6 w-6" />,
                  title: "KI-Interview-Training (Demnächst)",
                  description: "Bald verfügbar: Simulieren Sie Vorstellungsgespräche mit unserer KI. Üben Sie typische Fragen von Chefärzten."
                },
                {
                  icon: <Search className="h-6 w-6" />,
                  title: "Klinikstellen-Finder",
                  description: "Durchsuchen Sie täglich aktualisierte Assistenzarzt-Stellen aus ganz Deutschland."
                },
                {
                  icon: <Lock className="h-6 w-6" />,
                  title: "Dokument-Tresor",
                  description: "Speichern Sie alle wichtigen Dokumente sicher: Approbationsurkunde, Arbeitszeugnisse, Zertifikate."
                }
              ].map((feature, index) => (
                <ScrollSection key={index} className={`delay-${index * 50}`}>
                  <div className="glass-card-premium p-6 rounded-2xl bg-slate-50/50 h-full hover-lift group">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </ScrollSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50/50" id="bewertungen">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                Ärzte vertrauen Klaro bei ihrer Karriere
              </h2>
              <p className="text-lg text-slate-600">
                Über {userCount.toLocaleString("de-DE")} Ärzte nutzen Klaro für ihre Bewerbungen
              </p>
            </ScrollSection>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  quote: "Innerhalb von 2 Wochen hatte ich 5 Vorstellungsgespräche. Die automatische Anschreiben-Erstellung hat mir so viel Zeit gespart!",
                  author: "Dr. Lisa Schmidt",
                  role: "Assistenzärztin Kardiologie",
                  location: "Berlin"
                },
                {
                  quote: "Klaro hat meinen Lebenslauf perfekt formatiert – genau nach deutschem Standard mit Foto und Unterschrift. Die Personalabteilung war beeindruckt.",
                  author: "Dr. Michael Weber",
                  role: "Assistenzarzt Chirurgie",
                  location: "München"
                },
                {
                  quote: "Die perfekt vorbereiteten Unterlagen haben mir sehr geholfen. Alles war professionell formatiert und ich musste nur noch auf 'Senden' klicken.",
                  author: "Dr. Anna Hoffmann",
                  role: "Fachärztin Pädiatrie",
                  location: "Hamburg"
                },
                {
                  quote: "Als ausländischer Arzt war die deutsche Bewerbung eine Herausforderung. Klaro hat alles perfekt auf C1-Niveau formuliert.",
                  author: "Dr. Thomas Bauer",
                  role: "Assistenzarzt Innere Medizin",
                  location: "Heidelberg"
                },
                {
                  quote: "Ich habe mich bei 47 Kliniken beworben und 8 Zusagen erhalten. Ohne Klaro wäre das unmöglich gewesen.",
                  author: "Dr. Julia Schneider",
                  role: "Assistenzärztin Neurologie",
                  location: "Frankfurt"
                },
                {
                  quote: "Die automatische Stellensuche findet genau die Positionen, die zu meiner Fachrichtung passen. Super zeitsparend!",
                  author: "Dr. Daniel Koch",
                  role: "Facharzt Anästhesie",
                  location: "Stuttgart"
                }
              ].map((testimonial, index) => (
                <ScrollSection key={index} className={`delay-${index * 50}`}>
                  <div className="glass-card-premium p-6 rounded-2xl bg-white h-full">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-700 mb-6 leading-relaxed italic">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{testimonial.author}</div>
                        <div className="text-xs text-slate-500">{testimonial.role} • {testimonial.location}</div>
                      </div>
                    </div>
                  </div>
                </ScrollSection>
              ))}
            </div>

            <ScrollSection className="text-center">
              <Button asChild size="lg" className="rounded-full px-12 hover-lift">
                <Link to="/auth">Jetzt kostenlos starten</Link>
              </Button>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* Resume Examples Section */}
      <section className="py-24 bg-white" id="vorlagen">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                Lebenslauf-Vorlagen die überzeugen
              </h2>
              <p className="text-lg text-slate-600">
                Lassen Sie sich von professionellen Lebenslauf-Beispielen für verschiedene Fachrichtungen inspirieren
              </p>
            </ScrollSection>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[
                {
                  title: "Assistenzarzt Innere Medizin",
                  skills: ["Kardiologie", "Notfallmedizin", "EKG", "Sonographie"],
                  experience: "3 Jahre Berufserfahrung"
                },
                {
                  title: "Assistenzärztin Chirurgie",
                  skills: ["Viszeralchirurgie", "OP-Assistenz", "Traumatologie", "Minimal-invasiv"],
                  experience: "2 Jahre Berufserfahrung"
                },
                {
                  title: "Facharzt Pädiatrie",
                  skills: ["Neonatologie", "Kinderkardiologie", "U-Untersuchungen", "Impfmanagement"],
                  experience: "6 Jahre Berufserfahrung"
                },
                {
                  title: "Assistenzarzt Anästhesiologie",
                  skills: ["Intensivmedizin", "Schmerztherapie", "Notfallmedizin", "ZVK-Anlage"],
                  experience: "4 Jahre Berufserfahrung"
                },
                {
                  title: "Fachärztin Radiologie",
                  skills: ["CT", "MRT", "Röntgen", "Interventionelle Radiologie"],
                  experience: "5 Jahre Berufserfahrung"
                },
                {
                  title: "Oberarzt Neurologie",
                  skills: ["Stroke Unit", "EEG", "EMG", "Multiple Sklerose"],
                  experience: "8 Jahre Berufserfahrung"
                }
              ].map((example, index) => (
                <ScrollSection key={index} className={`delay-${index * 50}`}>
                  <div className="glass-card-premium p-6 rounded-2xl bg-slate-50/50 hover-lift group cursor-pointer">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-3">{example.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold mb-4">{example.experience}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {example.skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <span className="text-xs text-slate-400">Zuletzt aktualisiert</span>
                      <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </ScrollSection>
              ))}
            </div>

            <ScrollSection className="text-center">
              <Button asChild size="lg" variant="outline" className="rounded-full px-12 hover-lift border-2">
                <Link to="/auth">Alle Vorlagen ansehen</Link>
              </Button>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <ScrollSection className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                Häufig gestellte Fragen
              </h2>
            </ScrollSection>

            <div className="space-y-4">
              {[
                {
                  q: "Wie funktioniert Klaro?",
                  a: "Klaro ist eine KI-gestützte Plattform, die Ärzten hilft, schneller passende Klinikstellen zu finden und professionelle Bewerbungsunterlagen zu erstellen. Sie laden Ihre Daten einmal hoch, und Klaro generiert automatisch optimierte Lebensläufe und Anschreiben für jede Stelle."
                },
                {
                  q: "Entspricht der Lebenslauf dem deutschen Standard?",
                  a: "Ja, Klaro erstellt ausschließlich tabellarische Lebensläufe nach deutschem Standard – mit Foto (oben rechts), Unterschrift (unten) und allen erforderlichen Abschnitten (Berufserfahrung, Ausbildung, Weiterbildungen, Sprachkenntnisse)."
                },
                {
                  q: "Sind die Unterlagen ATS-kompatibel?",
                  a: "Ja, alle generierten Dokumente sind für Applicant Tracking Systems (ATS) optimiert und werden von Krankenhaus-Bewerbungssystemen problemlos gelesen."
                },
                {
                  q: "Was kostet Klaro?",
                  a: "Klaro ist derzeit komplett kostenlos für alle Ärzte. Sie können alle verfügbaren Funktionen ohne Einschränkungen nutzen – keine Kreditkarte erforderlich."
                },
                {
                  q: "Sind meine Daten sicher?",
                  a: "Ja, alle Daten werden DSGVO-konform in Deutschland gespeichert und verschlüsselt übertragen. Ihre Bewerbungsunterlagen sind nur für Sie sichtbar."
                }
              ].map((faq, index) => (
                <ScrollSection key={index} className={`delay-${index * 50}`}>
                  <div className="glass-card-premium p-6 rounded-2xl bg-white">
                    <h3 className="text-lg font-bold mb-2">{faq.q}</h3>
                    <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </ScrollSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl aspect-square bg-gradient-to-r from-primary/20 to-accent/20 blur-[120px] rounded-full" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <ScrollSection className="text-center space-y-10" animation="scroll-scale-in">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter max-w-4xl mx-auto">
              Starten Sie heute Ihre erfolgreiche Karriere
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Schließen Sie sich über {userCount.toLocaleString("de-DE")} Ärzten an, die mit Klaro
              schneller ihre Traumstelle im Krankenhaus gefunden haben
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="rounded-full px-12 h-16 text-lg font-bold shadow-apple-xl hover-lift">
                <Link to="/auth">Jetzt kostenlos starten</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 font-medium pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                100% kostenlos
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Keine Kreditkarte erforderlich
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Keine versteckten Kosten
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default NewLandingPage;
