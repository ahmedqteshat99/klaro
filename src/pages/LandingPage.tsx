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
  Mail
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
    const target = 1342;
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

          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2 font-medium">
            <Link to="/#unterlagen" className="text-sm text-slate-600 hover:text-primary transition-colors">Unterlagen</Link>
            <Link to="/#jobs" className="text-sm text-slate-600 hover:text-primary transition-colors flex items-center">
              Jobs
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">Neu</span>
            </Link>
            <Link to="/#preise" className="text-sm text-slate-600 hover:text-primary transition-colors">Preise</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors mr-2">Anmelden</Link>
            <Button asChild size="sm" className="rounded-full px-6 shadow-soft-glow hover-lift">
              <Link to="/auth">Kostenlos starten</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden mesh-gradient">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse opacity-50"></div>
          <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse opacity-50 delay-700"></div>
        </div>

        <div className="container relative mx-auto px-4 sm:px-6 z-10">
          <div className="max-w-4xl mx-auto text-center">
            {showDeletedNotice && (
              <Alert className="mb-6 text-left">
                <AlertTitle>Konto gelöscht</AlertTitle>
                <AlertDescription>
                  Ihr Konto und alle gespeicherten Daten wurden erfolgreich entfernt.
                </AlertDescription>
              </Alert>
            )}

            <ScrollSection animation="scroll-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-white/40 shadow-sm text-sm font-medium mb-8">
                <div className="flex -space-x-2 mr-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-5 w-5 rounded-full border border-white bg-slate-200" />
                  ))}
                </div>
                <span className="text-slate-600 font-normal">Ärzte-Bewertung: 4.9/5</span>
                <div className="flex items-center text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-100">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-8 tracking-tighter leading-[1.1] md:leading-[1.05]">
                In 5 Minuten zur Zusage:<br />
                <span className="text-primary italic">Der perfekte Lebenslauf</span><br />
                für Klinikärzte.
              </h1>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-200">
              <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                KI-gestützte Optimierung Ihrer Bewerbungsunterlagen nach deutschem Klinik-Standard.
                Erstellen Sie professionelle Lebensläufe und Anschreiben, die Chefärzte überzeugen.
              </p>
            </ScrollSection>

            <ScrollSection animation="scroll-fade-in" className="delay-300">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="text-base px-10 h-16 rounded-full shadow-soft-glow hover-lift bg-primary hover:bg-primary/90 text-white">
                  <Link
                    to="/auth"
                    onClick={() => rememberLandingCta("landing_hero_primary", "/auth")}
                  >
                    Jetzt Unterlagen optimieren
                    <ArrowRight className="ml-2 h-5 w-5 font-bold" />
                  </Link>
                </Button>
                <div className="text-sm text-slate-400 mt-2 sm:mt-0 font-medium">
                  Keine Kreditkarte erforderlich.
                </div>
              </div>
            </ScrollSection>

            {/* 3-Column Hero Grid Redesign */}
            <ScrollSection animation="scroll-fade-in" className="delay-500 mt-20 relative px-4">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Optimized Cover Letter Card */}
                <div className="group glass-card-premium p-6 rounded-[2.5rem] bg-white/80 shadow-apple-xl hover-lift">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-slate-800">Optimiertes Anschreiben</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">99.8% match</span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 aspect-[4/5] border border-slate-100 overflow-hidden relative shadow-inner">
                    <div className="space-y-3 opacity-40">
                      <div className="h-6 w-1/2 bg-slate-200 rounded" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-3/4 bg-slate-200 rounded-full" />
                      <div className="mt-6 h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-full bg-slate-200 rounded-full" />
                      <div className="h-2 w-2/3 bg-slate-200 rounded-full" />
                    </div>
                    <div className="absolute inset-x-4 bottom-4 p-4 bg-white/95 backdrop-blur-sm rounded-xl border border-primary/20 shadow-apple-lg">
                      <p className="text-[10px] text-slate-600 italic font-medium">
                        "Durch meine Erfahrung in der interdisziplinären Notaufnahme kenne ich die Herausforderungen..."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Optimized Resume Card */}
                <div className="group glass-card-premium p-6 rounded-[2.5rem] bg-white/80 shadow-apple-xl hover-lift">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-slate-800">Optimierter Lebenslauf</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">99.8% match</span>
                  </div>
                  <div className="bg-white rounded-2xl p-6 aspect-[4/5] border border-slate-100 overflow-hidden shadow-inner relative">
                    <div className="text-center mb-6">
                      <div className="h-12 w-12 rounded-full bg-slate-100 mx-auto mb-2 border-2 border-slate-50" />
                      <div className="h-3 w-24 bg-slate-800 rounded-full mx-auto" />
                      <div className="h-2 w-32 bg-slate-400 rounded-full mx-auto mt-2 opacity-50" />
                    </div>
                    <div className="space-y-4">
                      <div className="pt-2 border-t border-slate-50">
                        <div className="h-2 w-16 bg-slate-800 rounded-full mb-2" />
                        <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                        <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                        <div className="h-1.5 w-2/3 bg-slate-100 rounded-full" />
                      </div>
                      <div className="pt-2 border-t border-slate-50">
                        <div className="h-2 w-20 bg-slate-800 rounded-full mb-2" />
                        <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                        <div className="h-1.5 w-5/6 bg-slate-100 rounded-full" />
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                      <div className="px-2 py-1 rounded bg-primary text-[8px] text-white font-bold">Medizin</div>
                      <div className="px-2 py-1 rounded bg-slate-100 text-[8px] text-slate-600 font-bold">Modern</div>
                      <div className="px-2 py-1 rounded bg-slate-100 text-[8px] text-slate-600 font-bold">Akut</div>
                    </div>
                  </div>
                </div>

                {/* Auto Apply Card */}
                <div className="group glass-card-premium p-6 rounded-[2.5rem] bg-white/80 shadow-apple-xl hover-lift">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Mail className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-slate-800">Auto-Bewerbung</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">587 jobs</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { hospital: "Charité Berlin", role: "Assistentärzt Kardiologie", status: "Applied", logo: "C" },
                      { hospital: "Helios Klinken", role: "Facharzt Radiologie", status: "Pending", logo: "H" },
                      { hospital: "Vivantes Mitte", role: "Arzt Chirurgie", status: "Applied", logo: "V" },
                      { hospital: "Asklepios", role: "Oberarzt Innere", status: "Applied", logo: "A" }
                    ].map((job, idx) => (
                      <div key={job.hospital} className={`p-4 rounded-2xl border border-slate-100 bg-white shadow-soft transition-all group-hover:bg-slate-50/50 ${idx > 2 ? 'opacity-40 blur-[1px]' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500">{job.logo}</div>
                            <span className="text-[11px] font-bold text-slate-800">{job.role}</span>
                          </div>
                          <span className="text-[9px] font-medium text-slate-400">3h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">{job.hospital}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${job.status === 'Applied' ? 'bg-primary/10 text-primary' : 'bg-yellow-100 text-yellow-700'}`}>
                            {job.status === 'Applied' ? 'Beworben' : 'Wartend'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* Proof Bar Section */}
      <section className="py-12 border-b border-border/40 bg-white/50">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="max-w-4xl mx-auto text-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Eingestellt von führenden Krankenhäusern</p>
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 opacity-30 grayscale hover:grayscale-0 transition-all duration-300">
              <div className="text-2xl font-black text-slate-400 tracking-tighter">CHARITÉ</div>
              <div className="text-2xl font-black text-slate-400 tracking-tighter">VIVANTES</div>
              <div className="text-2xl font-black text-slate-400 tracking-tighter">HELIOS</div>
              <div className="text-2xl font-black text-slate-400 tracking-tighter">SANA</div>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* Feature Grid Section (Bento Box style) */}
      <section className="py-24 bg-slate-50/50" id="unterlagen">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <ScrollSection>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">Einfach. Medizinisches. Talent.</h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Struktur und Ton nach deutschem Klinik-Standard – ohne erfundene Fakten.
              </p>
            </ScrollSection>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
            {/* Bento Box 1: Large */}
            <ScrollSection className="md:col-span-2">
              <div className="glass-card-premium p-10 md:p-12 rounded-[2.5rem] h-full flex flex-col md:flex-row gap-8 items-center bg-white/60 group overflow-hidden">
                <div className="flex-1 space-y-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Medizinischer Lebenslauf-Generator</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">
                    Struktur nach aktuellstem Standard der Landesärztekammern.
                    Ihre klinischen Stationen perfekt im Blick des Chefarztes.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    In 2 Min. fertig <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
                {/* Illustration */}
                <div className="flex-1 w-full bg-slate-900 rounded-3xl aspect-[4/3] relative overflow-hidden ring-1 ring-white/10 shadow-2xl p-6 group-hover:translate-y-[-10px] transition-transform duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className="h-8 w-8 rounded-full bg-primary/20" />
                      <div className="h-2 w-32 bg-white/20 rounded-full" />
                    </div>
                    <div className="space-y-3 opacity-60">
                      <div className="h-2 w-full bg-white/10 rounded-full" />
                      <div className="h-2 w-[80%] bg-white/10 rounded-full" />
                      <div className="h-2 w-[90%] bg-white/10 rounded-full" />
                    </div>
                    <div className="mt-8 space-y-4">
                      <div className="h-2 w-24 bg-primary/30 rounded-full" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-12 bg-white/5 rounded-2xl border border-white/5" />
                        <div className="h-12 bg-white/5 rounded-2xl border border-white/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollSection>

            {/* Bento Box 2: Small */}
            <ScrollSection>
              <div className="glass-card-premium p-10 rounded-[2.5rem] h-full flex flex-col space-y-6 bg-white/60 group">
                <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:rotate-12 transition-transform">
                  <PenTool className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Anschreiben mit Präzision</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  Keine inhaltslosen Floskeln. Wir formulieren Ihre med. Schwerpunkte direkt.
                </p>
              </div>
            </ScrollSection>

            {/* Bento Box 3: Small */}
            <ScrollSection>
              <div className="glass-card-premium p-10 rounded-[2.5rem] h-full flex flex-col space-y-6 bg-white/60 group">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Stellen-Check</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  Laden Sie eine Anzeige hoch – wir passen Ihre Unterlagen sofort an das Profil an.
                </p>
              </div>
            </ScrollSection>

            {/* Bento Box 4: Large Horizontal */}
            <ScrollSection className="md:col-span-2">
              <div className="glass-card-premium p-10 md:p-12 rounded-[3rem] h-full flex flex-col md:flex-row gap-8 items-center bg-slate-900 text-white shadow-apple-2xl group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/10 blur-[100px] pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity" />
                <div className="flex-1 space-y-6 relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold">92% Einladungsquote</h3>
                  <p className="text-slate-300 leading-relaxed font-medium">
                    Datenbasierte Erfolge: Unterlagen, die mit Klaro erstellt wurden,
                    führen signifikant häufiger zum Vorstellungsgespräch.
                  </p>
                </div>
                <div className="flex-1 w-full grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white/5 rounded-3xl p-8 text-center border border-white/5 group-hover:bg-white/10 transition-colors">
                    <div className="text-4xl font-black mb-2">{userCount}+</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Erfolgreiche Ärzte</div>
                  </div>
                  <div className="bg-white/5 rounded-3xl p-8 text-center border border-white/5 group-hover:bg-white/10 transition-colors">
                    <div className="text-4xl font-black mb-2">4.9/5</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Top Bewertung</div>
                  </div>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive Section */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-16 max-w-6xl mx-auto">
            <ScrollSection className="flex-1 space-y-8" animation="scroll-fade-in-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                Fokus: Klinische Karriere
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">Anschreiben, die wirklich gelesen werden.</h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Unser System erkennt Ihre klinischen Stärken – egal ob Intensivmedizin, OPs oder Forschung –
                und formuliert sie präzise für die HR-Abteilung.
              </p>
              <ul className="space-y-4">
                {[
                  "Strukturierte klinische Abläufe",
                  "Fokus auf Schwerpunkte & OPs",
                  "Art. 9 DSGVO konform (Med. Daten)"
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 font-semibold text-slate-700">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="rounded-full px-10 h-16 shadow-apple-lg hover-lift bg-primary text-white">
                <Link to="/auth">Jetzt kostenlos testen</Link>
              </Button>
            </ScrollSection>

            <ScrollSection className="flex-1 w-full" animation="scroll-fade-in-right">
              <div className="glass-card-premium p-2 rounded-[2.5rem] bg-white shadow-apple-xl">
                <div className="bg-slate-50 p-10 rounded-[2.2rem] space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <span className="font-bold text-slate-800 text-sm">Vergleich</span>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">KI vs. Standard</span>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-xs text-red-800 italic line-through opacity-50">
                      "Ich bin teamfähig und motiviert für neue Aufgaben in Ihrer Klinik..."
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-xs text-green-800 font-medium">
                      "Durch meine Erfahrung in der interdisziplinären Notaufnahme kenne ich die
                      Herausforderungen einer schnellen Diagnostik und sicheren Primärversorgung."
                    </div>
                  </div>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* Feature Matrix Grid */}
      <section className="py-24 bg-slate-50/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: <Shield />, label: "Zertifikat-Safe" },
              { icon: <Zap />, label: "Fortbildungs-Track" },
              { icon: <Lock />, label: "Approbations-Sync" },
              { icon: <Globe />, label: "Fremdsprachen" },
              { icon: <FileText />, label: "Publikationen" },
              { icon: <Layout />, label: "OP-Integration" },
              { icon: <CheckCircle />, label: "Design-Match" },
              { icon: <Download />, label: "Export (PDF/DOCX)" }
            ].map((item, i) => (
              <ScrollSection key={i} className="flex flex-col items-center text-center space-y-4 group cursor-default">
                <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:shadow-md transition-all">
                  {item.icon}
                </div>
                <span className="text-sm font-bold text-slate-600 tracking-tight">{item.label}</span>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32" id="bewertungen">
        <div className="container mx-auto px-4 sm:px-6">
          <ScrollSection className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">Was Ihre Kollegen sagen.</h2>
            <p className="text-lg text-slate-500">Vertrauen von über {userCount} Ärzten deutschlandweit.</p>
          </ScrollSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                quote: "Dank Klaro habe ich meine Wunschstelle in der Kardiologie bekommen!",
                name: "Dr. med. Sara L.",
                role: "Assistenzärztin"
              },
              {
                quote: "Die Struktur des Lebenslaufs ist exakt das, was Chefärzte sehen wollen.",
                name: "Dr. Ahmed Q.",
                role: "Facharzt"
              },
              {
                quote: "Endlich ein System, das meine klinischen Schwerpunkte versteht.",
                name: "Dr. Paul M.",
                role: "Oberarzt"
              }
            ].map((t, i) => (
              <ScrollSection key={i}>
                <div className="glass-card-premium p-8 rounded-[2.5rem] h-full bg-white/60">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-primary text-primary" />)}
                  </div>
                  <p className="text-lg text-slate-700 font-medium mb-8 leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{t.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{t.role}</div>
                    </div>
                  </div>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-slate-900 text-white rounded-[4rem] mx-4 mb-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="container mx-auto px-10 relative z-10">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: "Profil-Upload", desc: "Wir lesen Ihre bestehenden Daten und Zeugnisse automatisch aus." },
              { title: "KI-Veredelung", desc: "Wir polieren Ihre klinischen Meilensteine nach dt. Standard." },
              { title: "Direkt-Export", desc: "Ihre PDF & DOCX Unterlagen sind bereit für den Versand." }
            ].map((s, i) => (
              <ScrollSection key={i} className="space-y-4">
                <div className="text-6xl font-black text-white/10">{i + 1}</div>
                <h3 className="text-2xl font-bold">{s.title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium">{s.desc}</p>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 text-center relative overflow-hidden">
        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl aspect-square bg-primary/10 blur-[120px] rounded-full opacity-60" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <ScrollSection className="space-y-10" animation="scroll-scale-in">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
              Werden Sie Teil der<br />neuen Ärzte-Generation.
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Schließen Sie sich über {userCount} Kollegen an, die ihre Karriere bereits beschleunigt haben.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="rounded-full px-12 h-16 shadow-apple-xl hover-lift text-lg font-bold bg-primary text-white">
                <Link to="/auth">Kostenlos starten</Link>
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
