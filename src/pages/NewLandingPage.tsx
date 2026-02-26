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
  ChevronRight,
  Check,
  ArrowUpRight
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
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: 'var(--notion-bg-base)' }}>
      {/* Navigation — Notion-style clean top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'var(--notion-bg-base)', borderColor: 'var(--notion-border)' }}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-[56px] sm:h-[68px] md:h-[78px] flex items-center">
              <img
                src="/brand/klaro-logo.png"
                alt="Klaro für Ärzte"
                className="h-full w-auto object-contain"
                draggable={false}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/jobs"
              className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-black/[0.04]"
              style={{ color: 'var(--notion-text-medium)' }}
            >
              Stellenangebote
            </Link>
            <Link
              to="/auth"
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-black/[0.04]"
              style={{ color: 'var(--notion-text-medium)' }}
            >
              Anmelden
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-90"
              style={{ background: 'var(--notion-text-dark)', color: '#fff' }}
              onClick={() => rememberLandingCta("landing_nav_cta", "/auth")}
            >
              ✨ Klaro kostenlos testen
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section — Notion-style large headline on clean canvas */}
      <section className="relative pt-16 pb-8 sm:pt-20 sm:pb-12 lg:pt-24 lg:pb-16" style={{ background: 'var(--notion-bg-base)' }}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 relative z-10">
          <div className="max-w-[800px] mx-auto text-center">
            {showDeletedNotice && (
              <Alert className="mb-6 text-left max-w-2xl mx-auto">
                <AlertTitle>Konto gelöscht</AlertTitle>
                <AlertDescription>
                  Ihr Konto und alle gespeicherten Daten wurden erfolgreich entfernt.
                </AlertDescription>
              </Alert>
            )}

            <ScrollSection animation="scroll-fade-in" className="flex items-center justify-center gap-8 mb-8">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'var(--notion-bg-surface)', border: '1px solid var(--notion-border-strong)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div className="flex -space-x-1.5">
                  {[1, 2, 3, 4].map(i => (
                    <img
                      key={i}
                      src={`/images/avatar-${i}.svg`}
                      alt={`Doctor ${i}`}
                      className="h-5 w-5 rounded-full border-2"
                      style={{ borderColor: 'var(--notion-bg-subtle)' }}
                    />
                  ))}
                </div>
                <span style={{ color: 'var(--notion-text-medium)' }}>
                  Vertraut von {userCount.toLocaleString("de-DE")}+ Ärzten
                </span>
              </div>

              <div className="relative w-[350px] h-[350px]" style={{ background: 'var(--notion-bg-base)' }}>
                <img
                  src="/images/doctor-illustration-new.png"
                  alt="Doctor"
                  className="w-full h-full object-contain"
                  style={{
                    mixBlendMode: 'multiply',
                    opacity: 0.95,
                    maskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
                  }}
                />
              </div>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-100">
              <h1 className="text-[2.5rem] sm:text-[3.25rem] md:text-[4rem] lg:text-[4.5rem] font-bold mb-6 leading-[1.08] tracking-[-0.03em]" style={{ color: 'var(--notion-text-dark)' }}>
                Ihre ärztliche Laufbahn.{' '}
                <span style={{ color: 'var(--notion-blue)' }}>
                  Null Papierkram.
                </span>
              </h1>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-200">
              <p className="text-lg sm:text-xl mb-10 max-w-[600px] mx-auto leading-relaxed" style={{ color: 'var(--notion-text-light)' }}>
                Klaro findet passende Klinikstellen, erstellt Lebenslauf & Anschreiben und bereitet Ihre Bewerbung vor – kostenlos.
              </p>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-300">
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
                <Link
                  to="/auth"
                  onClick={() => rememberLandingCta("landing_hero_primary", "/auth")}
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold rounded-xl transition-all hover:opacity-90 hover:translate-y-[-1px]"
                  style={{ background: 'var(--notion-text-dark)', color: '#fff' }}
                >
                  📝 Lebenslauf kostenlos erstellen
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold rounded-xl transition-all border hover:translate-y-[-1px]"
                  style={{ color: 'var(--notion-text-dark)', borderColor: 'var(--notion-border-strong)', background: 'transparent' }}
                >
                  🔍 Stellen durchsuchen
                </Link>
              </div>
              <div className="flex items-center justify-center gap-5 text-sm" style={{ color: 'var(--notion-text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" style={{ color: 'var(--notion-blue)' }} />
                  100% kostenlos
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" style={{ color: 'var(--notion-blue)' }} />
                  Keine Kreditkarte
                </span>
                <span className="flex items-center gap-1.5 font-medium ml-2 px-2.5 py-1 rounded-md" style={{ background: 'var(--notion-bg-elevated)', border: '1px solid var(--notion-border-strong)' }}>
                  <Shield className="h-3.5 w-3.5" style={{ color: 'var(--notion-blue)' }} />
                  100% DSGVO-konform & Hosted in DE
                </span>
              </div>
            </ScrollSection>

            {/* Clinic Trust Banner */}
            <ScrollSection animation="scroll-fade-in" className="delay-400 mt-14 md:mt-20 border-t pt-8 pb-4" style={{ borderColor: 'var(--notion-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--notion-text-muted)' }}>
                Ärzte unserer Plattform arbeiten erfolgreich bei
              </p>
              <div className="flex flex-wrap justify-center items-center gap-x-8 sm:gap-x-14 gap-y-6 opacity-60 grayscale hover:opacity-100 transition-opacity">
                <div className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-gray-800">CHARITÉ</div>
                <div className="text-xl sm:text-2xl font-sans font-black tracking-tighter text-gray-800">ASKLEPIOS</div>
                <div className="text-xl sm:text-2xl font-sans font-bold text-gray-800">Helios</div>
                <div className="text-xl sm:text-2xl font-sans font-medium tracking-wide text-gray-800">Sana Kliniken</div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>


      {/* Document Showcases Section */}
      <section className="py-16 md:py-28" style={{ background: 'var(--notion-bg-elevated)' }}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">

          {/* Optimized CV Showcase */}
          <ScrollSection className="mb-20 md:mb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="order-2 md:order-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5" style={{ background: 'var(--notion-blue-light)', color: 'var(--notion-blue)' }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  99,8% ATS-kompatibel
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
                  Optimierter Lebenslauf
                </h2>
                <p className="text-base mb-8 leading-[1.7]" style={{ color: 'var(--notion-text-light)' }}>
                  Tabellarischer deutscher Lebenslauf nach medizinischem Standard.
                  Mit Foto, Unterschrift und allen erforderlichen Abschnitten für Ihre Krankenhausbewerbung.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Berufserfahrung mit klinischen Stationen",
                    "Weiterbildungen & Zertifikate",
                    "Sprachkenntnisse (Deutsch C1, Englisch B2)",
                    "Unterschrift & Foto automatisch platziert"
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--notion-blue)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--notion-text-medium)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'var(--notion-text-dark)', color: '#fff' }}
                >
                  📄 Lebenslauf erstellen
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="order-1 md:order-2">
                <div className="rounded-2xl p-4 border" style={{ background: 'var(--notion-bg-subtle)', borderColor: 'var(--notion-border)' }}>
                  <div className="bg-white rounded-xl p-6 border aspect-[210/297]" style={{ borderColor: 'var(--notion-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <CvMockup />
                  </div>
                </div>
              </div>
            </div>
          </ScrollSection>

          {/* Optimized Cover Letter Showcase */}
          <ScrollSection className="mb-12 md:mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <div className="rounded-2xl p-4 border" style={{ background: 'var(--notion-bg-subtle)', borderColor: 'var(--notion-border)' }}>
                  <div className="rounded-xl p-6 border aspect-[210/297]" style={{ background: '#fafaf9', borderColor: 'var(--notion-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <CoverLetterMockup />
                  </div>
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5" style={{ background: 'var(--notion-blue-light)', color: 'var(--notion-blue)' }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  99,8% Übereinstimmung
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
                  Optimiertes Anschreiben
                </h2>
                <p className="text-base mb-8 leading-[1.7]" style={{ color: 'var(--notion-text-light)' }}>
                  Professionell formulierte Anschreiben nach deutschem Business-Standard.
                  Personalisiert auf jedes Krankenhaus und jede Stellenausschreibung.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Anrede nach Titel (Prof. Dr., Herr/Frau)",
                    "Bezug auf Stellenanforderungen",
                    "Medizinische Fachterminologie",
                    "Formale deutsche Struktur"
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--notion-blue)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--notion-text-medium)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all hover:opacity-90"
                  style={{ background: 'var(--notion-text-dark)', color: '#fff' }}
                >
                  ✍️ Anschreiben generieren
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* Key Metric Section — Notion-style stat banner */}
      <section className="py-14 md:py-20" style={{ background: 'var(--notion-text-dark)' }}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">
          <ScrollSection animation="scroll-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="md:max-w-[50%]">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight text-white">
                  80% schneller zur Zusage
                </h2>
                <p className="text-base text-white/60 leading-relaxed">
                  Im Durchschnitt erhalten Klaro-Nutzer innerhalb von 14 Tagen eine Einladung zum Vorstellungsgespräch.
                </p>
              </div>
              <div className="flex gap-8 md:gap-12">
                {[
                  { value: "14", unit: "Tage", label: "bis zum Interview" },
                  { value: "80%", unit: "", label: "schnellere Zusage" },
                  { value: "2.847", unit: "", label: "Ärzte vertrauen Klaro" }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tabular-nums">
                      {stat.value}<span className="text-white/40 text-lg">{stat.unit}</span>
                    </div>
                    <div className="text-xs text-white/50 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* Three-Step Process Section */}
      <section className="py-16 md:py-28" style={{ background: 'var(--notion-bg-base)' }} id="funktionen">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">
          <ScrollSection className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-bold mb-4 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
              So funktioniert Klaro
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--notion-text-light)' }}>
              Drei einfache Schritte zu Ihrer erfolgreichen Krankenhausbewerbung
            </p>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: "1",
                icon: <FileText className="h-5 w-5" />,
                title: "Vorbereiten",
                subtitle: "Professionelle Unterlagen in Minuten",
                description: "Generieren Sie automatisch optimierte Lebensläufe und Anschreiben für jede Klinikstelle.",
                features: [
                  "Tabellarischer deutscher Lebenslauf",
                  "Personalisiertes Anschreiben pro Stelle",
                  "Foto & Unterschrift automatisch platziert"
                ]
              },
              {
                step: "2",
                icon: <Mail className="h-5 w-5" />,
                title: "Bewerben",
                subtitle: "Bewerbungs-Vorbereitung",
                description: "Klaro findet passende Assistenzarzt-Positionen und bereitet eine fertige E-Mail mit allen Unterlagen vor.",
                features: [
                  "Intelligente Stellensuche nach Fachrichtung",
                  "Fertige E-Mail-Vorlage mit Anhängen",
                  "Bewerbungsstatus selbst verwalten"
                ],
                metric: "12.500+ Klinikstellen durchsucht"
              },
              {
                step: "3",
                icon: <MessageSquare className="h-5 w-5" />,
                title: "Überzeugen",
                subtitle: "Interview-Training",
                description: "Demnächst: Trainieren Sie mit unserer KI für Ihr Vorstellungsgespräch.",
                features: [
                  "Krankenhaus-spezifische Fragen",
                  "Live-Feedback zu Ihren Antworten",
                  "Fachbereichs-spezifisches Training"
                ],
                comingSoon: true
              }
            ].map((step, index) => (
              <ScrollSection key={index} className={`delay-${index * 100}`}>
                <div
                  className={`rounded-2xl p-6 sm:p-8 h-full border transition-all hover:border-[var(--notion-border-strong)] ${step.comingSoon ? 'opacity-70' : ''}`}
                  style={{ background: 'var(--notion-bg-elevated)', borderColor: 'var(--notion-border)' }}
                >
                  {/* Illustration */}
                  <div className="w-full h-36 sm:h-44 mb-5 rounded-xl overflow-hidden" style={{ background: 'var(--notion-bg-subtle)' }}>
                    {step.step === "1" && <PrepareIllustration />}
                    {step.step === "2" && <ApplyIllustration />}
                    {step.step === "3" && <ConvinceIllustration />}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--notion-bg-subtle)', color: 'var(--notion-text-medium)' }}>
                      {step.icon}
                    </div>
                    <span className="text-2xl font-bold" style={{ color: 'var(--notion-border-strong)' }}>{step.step}</span>
                  </div>

                  {step.comingSoon && (
                    <div className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold mb-3" style={{ background: '#fff3e0', color: '#e65100' }}>
                      DEMNÄCHST
                    </div>
                  )}

                  <h3 className="text-xl font-bold mb-1.5" style={{ color: 'var(--notion-text-dark)' }}>{step.title}</h3>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--notion-blue)' }}>{step.subtitle}</p>

                  {step.metric && (
                    <div className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold mb-3" style={{ background: 'var(--notion-blue-light)', color: 'var(--notion-blue)' }}>
                      {step.metric}
                    </div>
                  )}

                  <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--notion-text-light)' }}>{step.description}</p>

                  <ul className="space-y-2 mb-6">
                    {step.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--notion-text-medium)' }}>
                        <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--notion-blue)' }} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={step.comingSoon ? "#" : "/auth"}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity ${step.comingSoon ? 'pointer-events-none opacity-40' : 'hover:opacity-70'}`}
                    style={{ color: 'var(--notion-text-dark)' }}
                  >
                    {step.step === "1" && "Jetzt erstellen"}
                    {step.step === "2" && "Stellen durchsuchen"}
                    {step.step === "3" && "Bald verfügbar"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-28" style={{ background: 'var(--notion-bg-elevated)' }}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">
          <ScrollSection className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-bold mb-4 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
              Alles für Ihre erfolgreiche Bewerbung
            </h2>
          </ScrollSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <FileText className="h-5 w-5" />,
                title: "Lebenslauf-Optimierung",
                description: "Erstellen Sie einen ATS-optimierten deutschen Lebenslauf, der perfekt auf jede Klinikstelle zugeschnitten ist."
              },
              {
                icon: <PenTool className="h-5 w-5" />,
                title: "Anschreiben-Generator",
                description: "Generieren Sie in Sekunden ein maßgeschneidertes Anschreiben für jedes Krankenhaus."
              },
              {
                icon: <Layout className="h-5 w-5" />,
                title: "Bewerbungs-Tracker",
                description: "Verwalten Sie alle Ihre Bewerbungen zentral. Sehen Sie auf einen Blick den Status jeder Bewerbung."
              },
              {
                icon: <MessageSquare className="h-5 w-5" />,
                title: "KI-Interview-Training",
                description: "Bald verfügbar: Simulieren Sie Vorstellungsgespräche mit unserer KI. Üben Sie typische Fragen von Chefärzten."
              },
              {
                icon: <Search className="h-5 w-5" />,
                title: "Klinikstellen-Finder",
                description: "Durchsuchen Sie täglich aktualisierte Assistenzarzt-Stellen aus ganz Deutschland."
              },
              {
                icon: <Lock className="h-5 w-5" />,
                title: "Dokument-Tresor",
                description: "Speichern Sie alle wichtigen Dokumente sicher: Approbationsurkunde, Arbeitszeugnisse, Zertifikate."
              }
            ].map((feature, index) => (
              <ScrollSection key={index} className={`delay-${index * 50}`}>
                <div
                  className="rounded-xl p-5 h-full border transition-all group cursor-default hover:border-[var(--notion-border-strong)]"
                  style={{ background: 'var(--notion-bg-elevated)', borderColor: 'var(--notion-border)' }}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'var(--notion-bg-subtle)', color: 'var(--notion-text-medium)' }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: 'var(--notion-text-dark)' }}>{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--notion-text-light)' }}>{feature.description}</p>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-28" style={{ background: 'var(--notion-bg-base)' }} id="bewertungen">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">
          <ScrollSection className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--notion-text-muted)' }}>
              Bewertungen
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-bold mb-3 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
              Ärzte vertrauen Klaro
            </h2>
            <p className="text-base" style={{ color: 'var(--notion-text-light)' }}>
              Über {userCount.toLocaleString("de-DE")} Ärzte nutzen Klaro für ihre Bewerbungen
            </p>
          </ScrollSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
            {[
              {
                quote: "Innerhalb von 2 Wochen hatte ich 5 Vorstellungsgespräche. Die automatische Anschreiben-Erstellung hat mir so viel Zeit gespart!",
                author: "Dr. Lisa Schmidt",
                role: "Assistenzärztin Kardiologie",
                location: "Berlin",
                image: "/images/avatar_dr_schmidt_1772034991277.png"
              },
              {
                quote: "Klaro hat meinen Lebenslauf perfekt formatiert – genau nach deutschem Standard mit Foto und Unterschrift.",
                author: "Dr. Michael Weber",
                role: "Assistenzarzt Chirurgie",
                location: "München",
                image: "/images/avatar_dr_weber_1772035611085.png"
              },
              {
                quote: "Die perfekt vorbereiteten Unterlagen haben mir sehr geholfen. Alles war professionell formatiert.",
                author: "Dr. Anna Hoffmann",
                role: "Fachärztin Pädiatrie",
                location: "Hamburg",
                image: "https://images.unsplash.com/photo-1594824436998-d8abc9c9bcd8?q=80&w=200&auto=format&fit=crop"
              },
              {
                quote: "Als ausländischer Arzt war die deutsche Bewerbung eine Herausforderung. Klaro hat alles perfekt auf C1-Niveau formuliert.",
                author: "Dr. Thomas Bauer",
                role: "Assistenzarzt Innere Medizin",
                location: "Heidelberg",
                image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop"
              },
              {
                quote: "Ich habe mich bei 47 Kliniken beworben und 8 Zusagen erhalten. Ohne Klaro wäre das unmöglich gewesen.",
                author: "Dr. Julia Schneider",
                role: "Assistenzärztin Neurologie",
                location: "Frankfurt",
                image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&auto=format&fit=crop"
              },
              {
                quote: "Die automatische Stellensuche findet genau die Positionen, die zu meiner Fachrichtung passen.",
                author: "Dr. Daniel Koch",
                role: "Facharzt Anästhesie",
                location: "Stuttgart",
                image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=200&auto=format&fit=crop"
              }
            ].map((testimonial, index) => (
              <ScrollSection key={index} className={`delay-${index * 50}`}>
                <div
                  className="rounded-xl p-5 h-full border"
                  style={{ background: 'var(--notion-bg-elevated)', borderColor: 'var(--notion-border)' }}
                >
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--notion-text-medium)' }}>
                    „{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--notion-border)' }}>
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--notion-bg-subtle)' }}>
                      <img src={testimonial.image} alt={testimonial.author} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--notion-text-dark)' }}>{testimonial.author}</div>
                      <div className="text-xs" style={{ color: 'var(--notion-text-muted)' }}>{testimonial.role} · {testimonial.location}</div>
                    </div>
                  </div>
                </div>
              </ScrollSection>
            ))}
          </div>

          <ScrollSection className="text-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ background: 'var(--notion-text-dark)', color: '#fff' }}
            >
              🚀 Jetzt kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollSection>
        </div>
      </section>

      {/* Resume Examples Section */}
      <section className="py-16 md:py-28" style={{ background: 'var(--notion-bg-elevated)' }} id="vorlagen">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10">
          <ScrollSection className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--notion-text-muted)' }}>
              Vorlagen
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-bold mb-3 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
              Lebenslauf-Vorlagen die überzeugen
            </h2>
            <p className="text-base" style={{ color: 'var(--notion-text-light)' }}>
              Professionelle Lebenslauf-Beispiele für verschiedene Fachrichtungen
            </p>
          </ScrollSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
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
                <div
                  className="rounded-xl p-5 border transition-all cursor-pointer group hover:border-[var(--notion-border-strong)]"
                  style={{ background: 'var(--notion-bg-elevated)', borderColor: 'var(--notion-border)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--notion-bg-subtle)', color: 'var(--notion-text-muted)' }}>
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--notion-text-muted)' }} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--notion-text-dark)' }}>{example.title}</h3>
                  <p className="text-xs font-medium mb-4" style={{ color: 'var(--notion-text-muted)' }}>{example.experience}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {example.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: 'var(--notion-bg-subtle)', color: 'var(--notion-text-medium)' }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollSection>
            ))}
          </div>

          <ScrollSection className="text-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border transition-all hover:border-[var(--notion-border-strong)]"
              style={{ color: 'var(--notion-text-dark)', borderColor: 'var(--notion-border-strong)' }}
            >
              Alle Vorlagen ansehen
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </ScrollSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-28" style={{ background: 'var(--notion-bg-base)' }}>
        <div className="max-w-[720px] mx-auto px-5 md:px-10">
          <ScrollSection className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-[2.75rem] font-bold mb-4 tracking-tight" style={{ color: 'var(--notion-text-dark)' }}>
              Häufig gestellte Fragen
            </h2>
          </ScrollSection>

          <div className="space-y-3">
            {[
              {
                q: "Wie funktioniert Klaro?",
                a: "Klaro ist eine KI-gestützte Plattform, die Ärzten hilft, schneller passende Klinikstellen zu finden und professionelle Bewerbungsunterlagen zu erstellen. Sie laden Ihre Daten einmal hoch, und Klaro generiert automatisch optimierte Lebensläufe und Anschreiben für jede Stelle."
              },
              {
                q: "Entspricht der Lebenslauf dem deutschen Standard?",
                a: "Ja, Klaro erstellt ausschließlich tabellarische Lebensläufe nach deutschem Standard – mit Foto (oben rechts), Unterschrift (unten) und allen erforderlichen Abschnitten."
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
                <div
                  className="rounded-xl p-5 border"
                  style={{ background: 'var(--notion-bg-elevated)', borderColor: 'var(--notion-border)' }}
                >
                  <h3 className="text-base font-bold mb-2" style={{ color: 'var(--notion-text-dark)' }}>{faq.q}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--notion-text-light)' }}>{faq.a}</p>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-28 md:py-36 relative" style={{ background: 'var(--notion-bg-elevated)' }}>
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 relative z-10">
          <ScrollSection className="text-center" animation="scroll-fade-in">
            <p className="text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: 'var(--notion-text-muted)' }}>
              Kostenlos starten
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-[3.5rem] font-bold tracking-tight mb-6 leading-[1.1]" style={{ color: 'var(--notion-text-dark)' }}>
              Starten Sie heute Ihre<br className="hidden sm:block" /> erfolgreiche Karriere
            </h2>
            <p className="text-base sm:text-lg mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--notion-text-light)' }}>
              Schließen Sie sich über {userCount.toLocaleString("de-DE")} Ärzten an, die mit Klaro schneller ihre Traumstelle gefunden haben.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-xl transition-all hover:opacity-90 hover:translate-y-[-1px]"
                style={{ background: 'var(--notion-text-dark)', color: '#fff' }}
              >
                ✨ Lebenslauf kostenlos erstellen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center justify-center gap-5 text-sm" style={{ color: 'var(--notion-text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--notion-blue)' }} />
                100% kostenlos
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--notion-blue)' }} />
                Keine Kreditkarte
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--notion-blue)' }} />
                DSGVO-konform
              </span>
            </div>
          </ScrollSection>
        </div>
      </section>

      <AppFooter />
    </div>
  );
};

export default NewLandingPage;
