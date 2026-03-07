import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useDocumentVersions } from "@/hooks/useDocumentVersions";
import { useUserFileUrl } from "@/hooks/useUserFileUrl";
import { useAiConsent } from "@/hooks/useAiConsent";
import { generateCV } from "@/lib/api/generation";
import { downloadPdfFromServer } from "@/lib/api/pdf-service";
import { logEvent, touchLastSeen } from "@/lib/app-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  PenTool,
  User,
  Stethoscope,
  Building2,
  GraduationCap,
  Microscope,
  Brain,
  Languages,
  Award,
  BookOpen,
  Camera,
  Bell,
  HardDrive,
  Trash2,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";

import PersonalDataForm from "@/components/profile/PersonalDataForm";
import ProfessionalProfileForm from "@/components/profile/ProfessionalProfileForm";
import WorkExperienceForm from "@/components/profile/WorkExperienceForm";
import EducationForm from "@/components/profile/EducationForm";
import PracticalExperienceForm from "@/components/profile/PracticalExperienceForm";
import SkillsForm from "@/components/profile/SkillsForm";
import LanguageSkillsForm from "@/components/profile/LanguageSkillsForm";
import CertificationsForm from "@/components/profile/CertificationsForm";
import PublicationsForm from "@/components/profile/PublicationsForm";
import PhotoUpload from "@/components/profile/PhotoUpload";
import SignatureCanvas from "@/components/profile/SignatureCanvas";
import CvImportCard from "@/components/profile/CvImportCard";
import { CustomSectionForm } from "@/components/profile/CustomSectionForm";
import EmailNotificationPreferences from "@/components/profile/EmailNotificationPreferences";
import UserDataExport from "@/components/profile/UserDataExport";
import DeleteAccountCard from "@/components/profile/DeleteAccountCard";
import CVTemplate from "@/components/cv/CVTemplate";
import ProfileCompleteness from "@/components/profile/ProfileCompleteness";
import CollapsibleSection from "@/components/profile/CollapsibleSection";
import SectionNav, { type NavSection } from "@/components/profile/SectionNav";
import MobileNavBar from "@/components/profile/MobileNavBar";

/* ── Accent colours per section ────────────────────────────────── */
const ACCENT = {
  personal: "#3b82f6",     // blue
  photo: "#8b5cf6",        // violet
  signature: "#6366f1",    // indigo
  professional: "#0ea5e9", // sky
  work: "#f59e0b",         // amber
  education: "#10b981",    // emerald
  practical: "#14b8a6",    // teal
  skills: "#ec4899",       // pink
  languages: "#6366f1",    // indigo
  certs: "#f97316",        // orange
  publications: "#8b5cf6", // violet
  notifications: "#64748b",// slate
  export: "#64748b",       // slate
  delete: "#ef4444",       // red
};

const ProfilPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const { toast } = useToast();

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);
  const [isExportingCV, setIsExportingCV] = useState(false);
  const [isLoadingLatestCV, setIsLoadingLatestCV] = useState(true);
  const [showFoto, setShowFoto] = useState(true);
  const [showSignatur, setShowSignatur] = useState(true);
  const [cvHtml, setCvHtml] = useState<string | null>(null);

  const cvStudioRef = useRef<HTMLDivElement | null>(null);

  const { hasConsent, grantConsent } = useAiConsent();

  const { saveDocument, getLatestDocument } = useDocumentVersions();

  const {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    customSections,
    isLoading,
    userId,
    saveProfile,
    addWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    addWorkExperiencesLocal,
    addEducation,
    updateEducation,
    deleteEducation,
    addEducationEntriesLocal,
    addPracticalExperience,
    updatePracticalExperience,
    deletePracticalExperience,
    addPracticalExperiencesLocal,
    addCertification,
    updateCertification,
    deleteCertification,
    addCertificationsLocal,
    addPublication,
    updatePublication,
    deletePublication,
    updateLocalProfile,
    addPublicationsLocal,
    addCustomSection,
    updateCustomSection,
    deleteCustomSection,
    addCustomSectionEntry,
    updateCustomSectionEntry,
    deleteCustomSectionEntry,
    getEntriesForSection,
  } = useProfile();

  const { url: fotoUrl } = useUserFileUrl(profile?.foto_url);
  const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

  /* ── Auth guard ───────────────────────────────────────────────── */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadLatestCV = useCallback(async () => {
    if (!userId) return;
    setIsLoadingLatestCV(true);

    try {
      const latest = await getLatestDocument(userId, "CV");
      if (latest?.html_content) {
        setCvHtml(latest.html_content);
      }
    } catch (error) {
      console.error("Error loading latest CV", error);
    } finally {
      setIsLoadingLatestCV(false);
    }
  }, [getLatestDocument, userId]);

  useEffect(() => {
    if (!userId) return;
    void loadLatestCV();
  }, [loadLatestCV, userId]);

  useEffect(() => {
    if (!userId) return;
    void touchLastSeen(userId);
  }, [userId]);

  useEffect(() => {
    if (isAuthLoading || isLoading) return;

    if (focus === "cv-profile") {
      cvStudioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focus, isAuthLoading, isLoading]);

  /* ── CV generation / export ──────────────────────────────────── */
  const handleGenerateCV = async () => {
    if (!profile?.vorname || !profile?.nachname) {
      toast({
        title: "Profil unvollständig",
        description: "Bitte mindestens Vorname und Nachname ergänzen.",
        variant: "destructive",
      });
      return;
    }

    // Auto-grant AI consent when user clicks generate button
    if (!hasConsent) {
      grantConsent();
    }

    setIsGeneratingCV(true);
    try {
      const result = await generateCV({
        profile,
        workExperiences,
        educationEntries,
        practicalExperiences,
        certifications,
        publications,
      });

      if (!result.success || !result.html) {
        throw new Error(result.error || "Lebenslauf konnte nicht erstellt werden.");
      }

      setCvHtml(result.html);

      if (userId) {
        await saveDocument({
          userId,
          typ: "CV",
          htmlContent: result.html,
          showFoto,
          showSignatur,
        });
      }

      void logEvent("generate", { docType: "CV", source: "profile_page" }, userId);
      void touchLastSeen(userId);
      void loadLatestCV();

      toast({
        title: "Lebenslauf erstellt",
        description: "Die neue Version ist gespeichert und in der Vorschau sichtbar.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Lebenslauf konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCV(false);
    }
  };

  const handleExportCV = async () => {
    if (!cvHtml) return;

    setIsExportingCV(true);
    try {
      await downloadPdfFromServer({
        type: "cv",
        htmlContent: cvHtml,
        showFoto,
        fotoUrl,
        showSignatur,
        signaturUrl,
        stadt: profile?.stadt,
        fileName: `Lebenslauf_${profile?.nachname || "Arzt"}.pdf`,
      });

      void logEvent("export", { docType: "CV", source: "profile_page", format: "PDF" }, userId);
      void touchLastSeen(userId);
    } catch (error) {
      toast({
        title: "PDF-Export fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    } finally {
      setIsExportingCV(false);
    }
  };

  /* ── Nav sections for sidebar ────────────────────────────────── */
  const navSections = useMemo<NavSection[]>(() => {
    const p = profile;
    return [
      { id: "sec-personal", label: "Persönliche Daten", icon: <User className="h-4 w-4" />, group: "cv", filled: !!(p?.vorname && p?.nachname && p?.email) },
      { id: "sec-photo", label: "Foto & Unterschrift", icon: <Camera className="h-4 w-4" />, group: "cv", filled: !!p?.foto_url },
      { id: "sec-professional", label: "Berufliches Profil", icon: <Stethoscope className="h-4 w-4" />, group: "cv", filled: !!(p?.fachrichtung) },
      { id: "sec-work", label: "Berufserfahrung", icon: <Building2 className="h-4 w-4" />, group: "cv", filled: workExperiences.length > 0 },
      { id: "sec-education", label: "Ausbildung", icon: <GraduationCap className="h-4 w-4" />, group: "cv", filled: educationEntries.length > 0 },
      { id: "sec-practical", label: "Praktische Erfahrung", icon: <Microscope className="h-4 w-4" />, group: "cv", filled: practicalExperiences.length > 0 },
      { id: "sec-skills", label: "Kenntnisse", icon: <Brain className="h-4 w-4" />, group: "cv", filled: !!(p?.medizinische_kenntnisse && (p.medizinische_kenntnisse as string[]).length > 0) },
      { id: "sec-languages", label: "Sprachen", icon: <Languages className="h-4 w-4" />, group: "cv", filled: !!(p?.sprachkenntnisse && (p.sprachkenntnisse as string[]).length > 0) },
      { id: "sec-certs", label: "Zertifikate", icon: <Award className="h-4 w-4" />, group: "cv", filled: certifications.length > 0 },
      { id: "sec-publications", label: "Publikationen", icon: <BookOpen className="h-4 w-4" />, group: "cv", filled: publications.length > 0 },
      { id: "sec-notifications", label: "Benachrichtigungen", icon: <Bell className="h-4 w-4" />, group: "account" },
      { id: "sec-export", label: "Datenexport", icon: <HardDrive className="h-4 w-4" />, group: "account" },
      { id: "sec-delete", label: "Konto löschen", icon: <Trash2 className="h-4 w-4" />, group: "account" },
    ];
  }, [profile, workExperiences, educationEntries, practicalExperiences, certifications, publications]);

  /* ── Section summaries for collapsed state ──────────────────── */
  const summaryPersonal = profile?.vorname
    ? `${profile.vorname} ${profile.nachname || ""}`.trim()
    : "Noch nicht ausgefüllt";

  const summaryWork = workExperiences.length > 0
    ? `${workExperiences.length} Einträge`
    : "Noch keine Einträge";

  const summaryEdu = educationEntries.length > 0
    ? `${educationEntries.length} Einträge`
    : "Noch keine Einträge";

  const summaryPractical = practicalExperiences.length > 0
    ? `${practicalExperiences.length} Einträge`
    : "Noch keine Einträge";

  const summaryCerts = certifications.length > 0
    ? `${certifications.length} Einträge`
    : "Noch keine Einträge";

  const summaryPubs = publications.length > 0
    ? `${publications.length} Einträge`
    : "Noch keine Einträge";

  /* ── Loading state ───────────────────────────────────────────── */
  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lädt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <BrandLogo />
          </Link>
          <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Zurück zum Dashboard</span>
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8">
        {/* Page header */}
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">CV & Profile</h1>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/profil?focus=cv-profile">Zum CV-Studio</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/unterlagen">Zu Unterlagen</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/anschreiben">Zum Anschreiben-Studio</Link>
          </Button>
        </div>

        {/* CV Studio card — stays as-is at the top */}
        <div
          id="cv-studio"
          ref={cvStudioRef}
          className={`mb-6 scroll-mt-28 ${focus === "cv-profile" ? "ring-2 ring-primary/25 rounded-2xl" : ""}`}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                CV Studio
              </CardTitle>
              <CardDescription>Generieren, prüfen, exportieren.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] items-start">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Letzte Version</p>
                  <p className="font-medium mt-1">
                    {isLoadingLatestCV ? "Lädt…" : cvHtml ? "Vorhanden" : "Noch kein CV generiert"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="showFoto" checked={showFoto} onCheckedChange={setShowFoto} />
                  <Label htmlFor="showFoto">Foto einblenden</Label>
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="showSignatur" checked={showSignatur} onCheckedChange={setShowSignatur} />
                  <Label htmlFor="showSignatur" className="flex items-center gap-1">
                    <PenTool className="h-4 w-4" /> Signatur einblenden
                  </Label>
                </div>

                {/* AI Disclaimer Link */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    ⚠️ <strong>KI-Generierung:</strong> Durch Klick auf "Lebenslauf neu generieren" stimmen Sie der{" "}
                    <Link
                      to="/agb"
                      target="_blank"
                      className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200"
                    >
                      KI-Nutzung
                    </Link>
                    {" "}zu. Sie sind für die Überprüfung aller generierten Inhalte verantwortlich.
                  </p>
                </div>

                <Button onClick={handleGenerateCV} disabled={isGeneratingCV} className="w-full">
                  {isGeneratingCV ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Lebenslauf neu generieren
                </Button>

                <Button onClick={handleExportCV} disabled={!cvHtml || isExportingCV} variant="outline" className="w-full">
                  {isExportingCV ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Als PDF herunterladen
                </Button>
              </div>

              <div>
                <ScrollArea className="max-h-[560px] rounded-lg border overflow-auto">
                  {cvHtml ? (
                    <div className="cv-paper-wrapper bg-gray-100 p-1 sm:p-4">
                      <CVTemplate
                        htmlContent={cvHtml}
                        showFoto={showFoto}
                        fotoUrl={fotoUrl ?? undefined}
                        showSignatur={showSignatur}
                        signaturUrl={signaturUrl ?? undefined}
                        stadt={profile?.stadt}
                      />
                    </div>
                  ) : (
                    <div className="h-[320px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <FileText className="h-10 w-10 mb-3 opacity-60" />
                      <p className="font-medium">Noch kein Lebenslauf vorhanden</p>
                      <p className="text-sm">Klicken Sie links auf "Lebenslauf neu generieren".</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CV Import */}
        <div className="mb-6">
          <CvImportCard
            profile={profile}
            customSections={customSections}
            updateLocalProfile={updateLocalProfile}
            saveProfile={saveProfile}
            addWorkExperiencesLocal={addWorkExperiencesLocal}
            addWorkExperience={addWorkExperience}
            addEducationEntriesLocal={addEducationEntriesLocal}
            addEducation={addEducation}
            addPracticalExperiencesLocal={addPracticalExperiencesLocal}
            addPracticalExperience={addPracticalExperience}
            addCertificationsLocal={addCertificationsLocal}
            addCertification={addCertification}
            addPublicationsLocal={addPublicationsLocal}
            addPublication={addPublication}
            addCustomSection={addCustomSection}
            addCustomSectionEntry={addCustomSectionEntry}
          />
        </div>

        {/* Completeness bar */}
        <div className="mb-6">
          <ProfileCompleteness
            profile={profile}
            workExperiences={workExperiences}
            educationEntries={educationEntries}
            practicalExperiences={practicalExperiences}
            certifications={certifications}
            publications={publications}
          />
        </div>

        {/* ── Main content: Sidebar + collapsible sections ────── */}
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 pb-20 lg:pb-8">
          {/* Sidebar navigator */}
          <SectionNav sections={navSections} />

          {/* Stacked collapsible sections */}
          <div className="space-y-4">
            {/* Persönliche Daten */}
            <CollapsibleSection
              id="sec-personal"
              icon={<User className="h-5 w-5" />}
              title="Persönliche Daten"
              subtitle="Grundlegende Informationen für Ihren Lebenslauf"
              summary={summaryPersonal}
              accentColor={ACCENT.personal}
              defaultOpen
            >
              <PersonalDataForm profile={profile} onSave={saveProfile} isLoading={isLoading} />
            </CollapsibleSection>

            {/* Foto & Unterschrift */}
            <CollapsibleSection
              id="sec-photo"
              icon={<Camera className="h-5 w-5" />}
              title="Foto & Unterschrift"
              subtitle="Profilfoto und Signatur für Ihren Lebenslauf"
              summary={profile?.foto_url ? "Foto vorhanden" : "Kein Foto hochgeladen"}
              accentColor={ACCENT.photo}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PhotoUpload profile={profile} userId={userId} onSave={saveProfile} />
                <SignatureCanvas profile={profile} userId={userId} onSave={saveProfile} />
              </div>
            </CollapsibleSection>

            {/* Berufliches Profil */}
            <CollapsibleSection
              id="sec-professional"
              icon={<Stethoscope className="h-5 w-5" />}
              title="Berufliches Profil"
              subtitle="Fachrichtung, Approbation und weitere berufliche Details"
              summary={profile?.fachrichtung || "Noch nicht ausgefüllt"}
              accentColor={ACCENT.professional}
            >
              <ProfessionalProfileForm profile={profile} onSave={saveProfile} isLoading={isLoading} />
            </CollapsibleSection>

            {/* Berufserfahrung */}
            <CollapsibleSection
              id="sec-work"
              icon={<Building2 className="h-5 w-5" />}
              title="Berufserfahrung"
              subtitle="Ihre bisherigen Stellen in Kliniken und Praxen"
              summary={summaryWork}
              accentColor={ACCENT.work}
            >
              <WorkExperienceForm
                workExperiences={workExperiences}
                onAdd={addWorkExperience}
                onUpdate={updateWorkExperience}
                onDelete={deleteWorkExperience}
              />
            </CollapsibleSection>

            {/* Ausbildung & Studium */}
            <CollapsibleSection
              id="sec-education"
              icon={<GraduationCap className="h-5 w-5" />}
              title="Ausbildung & Studium"
              subtitle="Ihr akademischer Werdegang"
              summary={summaryEdu}
              accentColor={ACCENT.education}
            >
              <EducationForm
                educationEntries={educationEntries}
                onAdd={addEducation}
                onUpdate={updateEducation}
                onDelete={deleteEducation}
              />
            </CollapsibleSection>

            {/* Praktische Erfahrung */}
            <CollapsibleSection
              id="sec-practical"
              icon={<Microscope className="h-5 w-5" />}
              title="Praktische Erfahrung"
              subtitle="Famulaturen, PJ-Stationen und Hospitationen"
              summary={summaryPractical}
              accentColor={ACCENT.practical}
            >
              <PracticalExperienceForm
                practicalExperiences={practicalExperiences}
                onAdd={addPracticalExperience}
                onUpdate={updatePracticalExperience}
                onDelete={deletePracticalExperience}
              />
            </CollapsibleSection>

            {/* Kenntnisse & Fähigkeiten */}
            <CollapsibleSection
              id="sec-skills"
              icon={<Brain className="h-5 w-5" />}
              title="Kenntnisse & Fähigkeiten"
              subtitle="Ihre medizinischen und technischen Kompetenzen"
              summary={
                profile?.medizinische_kenntnisse && (profile.medizinische_kenntnisse as string[]).length > 0
                  ? `${(profile.medizinische_kenntnisse as string[]).length} Kenntnisse`
                  : "Noch keine Kenntnisse"
              }
              accentColor={ACCENT.skills}
            >
              <SkillsForm profile={profile} onSave={saveProfile} isLoading={isLoading} />
            </CollapsibleSection>

            {/* Sprachkenntnisse */}
            <CollapsibleSection
              id="sec-languages"
              icon={<Languages className="h-5 w-5" />}
              title="Sprachkenntnisse"
              subtitle="Ihre Sprachkenntnisse mit Niveau-Angabe"
              summary={
                profile?.sprachkenntnisse && (profile.sprachkenntnisse as string[]).length > 0
                  ? `${(profile.sprachkenntnisse as string[]).length} Sprachen`
                  : "Noch keine Sprachen"
              }
              accentColor={ACCENT.languages}
            >
              <LanguageSkillsForm profile={profile} onSave={saveProfile} isLoading={isLoading} />
            </CollapsibleSection>

            {/* Fortbildungen & Zertifikate */}
            <CollapsibleSection
              id="sec-certs"
              icon={<Award className="h-5 w-5" />}
              title="Fortbildungen & Zertifikate"
              subtitle="ACLS, ATLS, Ultraschallkurse und weitere Qualifikationen"
              summary={summaryCerts}
              accentColor={ACCENT.certs}
            >
              <CertificationsForm
                certifications={certifications}
                onAdd={addCertification}
                onUpdate={updateCertification}
                onDelete={deleteCertification}
              />
            </CollapsibleSection>

            {/* Wissenschaft & Publikationen */}
            <CollapsibleSection
              id="sec-publications"
              icon={<BookOpen className="h-5 w-5" />}
              title="Wissenschaft & Publikationen"
              subtitle="Veröffentlichungen, Kongresse, Vorträge und Doktorarbeit"
              summary={summaryPubs}
              accentColor={ACCENT.publications}
            >
              <PublicationsForm
                publications={publications}
                onAdd={addPublication}
                onUpdate={updatePublication}
                onDelete={deletePublication}
              />
            </CollapsibleSection>

            {/* Custom Sections */}
            {customSections.map((section) => (
              <CollapsibleSection
                key={section.id}
                id={`sec-custom-${section.id}`}
                icon={<FileText className="h-5 w-5" />}
                title={section.section_name}
                subtitle=""
                summary={`${getEntriesForSection(section.id).length} Einträge`}
                accentColor={ACCENT.professional}
              >
                <CustomSectionForm
                  section={section}
                  entries={getEntriesForSection(section.id)}
                  onUpdateSection={updateCustomSection}
                  onDeleteSection={deleteCustomSection}
                  onAddEntry={addCustomSectionEntry}
                  onUpdateEntry={updateCustomSectionEntry}
                  onDeleteEntry={deleteCustomSectionEntry}
                />
              </CollapsibleSection>
            ))}

            {/* ── Account sections ─────────────────────────────── */}
            <div className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3 lg:hidden">
                Konto
              </p>
            </div>

            <CollapsibleSection
              id="sec-notifications"
              icon={<Bell className="h-5 w-5" />}
              title="Benachrichtigungen"
              subtitle="E-Mail-Benachrichtigungen und Job-Alerts"
              summary="Einstellungen verwalten"
              accentColor={ACCENT.notifications}
            >
              <EmailNotificationPreferences />
            </CollapsibleSection>

            <CollapsibleSection
              id="sec-export"
              icon={<HardDrive className="h-5 w-5" />}
              title="Datenexport"
              subtitle="Laden Sie alle Ihre persönlichen Daten herunter"
              summary="DSGVO Art. 20"
              accentColor={ACCENT.export}
            >
              <UserDataExport />
            </CollapsibleSection>

            <CollapsibleSection
              id="sec-delete"
              icon={<Trash2 className="h-5 w-5" />}
              title="Konto löschen"
              subtitle="Konto und alle Daten unwiderruflich löschen"
              summary=""
              accentColor={ACCENT.delete}
            >
              <DeleteAccountCard />
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      <MobileNavBar sections={navSections} />
    </div>
  );
};

export default ProfilPage;
