import { useCallback, useEffect, useRef, useState } from "react";
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
import { ArrowLeft, Download, FileText, Loader2, PenTool, User } from "lucide-react";
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
import AiConsentModal from "@/components/profile/AiConsentModal";
import CVTemplate from "@/components/cv/CVTemplate";

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
  const [showAiConsentModal, setShowAiConsentModal] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState(false);

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

  const handleGenerateCV = async () => {
    if (!profile?.vorname || !profile?.nachname) {
      toast({
        title: "Profil unvollständig",
        description: "Bitte mindestens Vorname und Nachname ergänzen.",
        variant: "destructive",
      });
      return;
    }

    // Check for AI consent
    if (!hasConsent) {
      setPendingGeneration(true);
      setShowAiConsentModal(true);
      return;
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

  const handleAiConsentGranted = () => {
    grantConsent();
    setShowAiConsentModal(false);

    if (pendingGeneration) {
      setPendingGeneration(false);
      // Retry generation after consent
      setTimeout(() => handleGenerateCV(), 100);
    }
  };

  const handleAiConsentDeclined = () => {
    setShowAiConsentModal(false);
    setPendingGeneration(false);

    toast({
      title: "KI-Generierung abgebrochen",
      description: "Ohne Einwilligung können wir keine KI-gestützten Texte erstellen. Sie können Ihre Einwilligung jederzeit erteilen.",
      variant: "default",
    });
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

        <div className="mb-6">
          <CvImportCard
            profile={profile}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          <div className="lg:col-span-1 space-y-6 order-1 lg:order-1">
            <PhotoUpload profile={profile} userId={userId} onSave={saveProfile} />
            <SignatureCanvas profile={profile} userId={userId} onSave={saveProfile} />
          </div>

          <div className="lg:col-span-2 space-y-6 order-2 lg:order-2">
            <PersonalDataForm profile={profile} onSave={saveProfile} isLoading={isLoading} />

            <ProfessionalProfileForm profile={profile} onSave={saveProfile} isLoading={isLoading} />
            <WorkExperienceForm
              workExperiences={workExperiences}
              onAdd={addWorkExperience}
              onUpdate={updateWorkExperience}
              onDelete={deleteWorkExperience}
            />

            <EducationForm
              educationEntries={educationEntries}
              onAdd={addEducation}
              onUpdate={updateEducation}
              onDelete={deleteEducation}
            />

            <PracticalExperienceForm
              practicalExperiences={practicalExperiences}
              onAdd={addPracticalExperience}
              onUpdate={updatePracticalExperience}
              onDelete={deletePracticalExperience}
            />

            <SkillsForm profile={profile} onSave={saveProfile} isLoading={isLoading} />

            <LanguageSkillsForm profile={profile} onSave={saveProfile} isLoading={isLoading} />

            <CertificationsForm
              certifications={certifications}
              onAdd={addCertification}
              onUpdate={updateCertification}
              onDelete={deleteCertification}
            />

            <PublicationsForm
              publications={publications}
              onAdd={addPublication}
              onUpdate={updatePublication}
              onDelete={deletePublication}
            />

            <EmailNotificationPreferences />

            <UserDataExport />

            {customSections.map((section) => (
              <CustomSectionForm
                key={section.id}
                section={section}
                entries={getEntriesForSection(section.id)}
                onUpdateSection={updateCustomSection}
                onDeleteSection={deleteCustomSection}
                onAddEntry={addCustomSectionEntry}
                onUpdateEntry={updateCustomSectionEntry}
                onDeleteEntry={deleteCustomSectionEntry}
              />
            ))}
          </div>
        </div>
      </div>

      <AiConsentModal
        open={showAiConsentModal}
        onConsent={handleAiConsentGranted}
        onDecline={handleAiConsentDeclined}
      />
    </div>
  );
};

export default ProfilPage;
