import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useProfile } from "@/hooks/useProfile";
import { useDocumentVersions } from "@/hooks/useDocumentVersions";
import { useToast } from "@/hooks/use-toast";
import { useUserFileUrl } from "@/hooks/useUserFileUrl";
import { generateAnschreiben } from "@/lib/api/generation";
import { downloadPdfFromServer } from "@/lib/api/pdf-service";
import { logEvent, touchLastSeen } from "@/lib/app-events";
import BrandLogo from "@/components/BrandLogo";
import JobExtractionForm from "@/components/generation/JobExtractionForm";
import CVTemplate from "@/components/cv/CVTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  PenTool,
  Sparkles,
  Trash2,
} from "lucide-react";

interface ComposerJobData {
  krankenhaus: string | null;
  standort: string | null;
  fachabteilung: string | null;
  position: string | null;
  ansprechpartner: string | null;
  anforderungen: string | null;
}

type AnschreibenVersion = Pick<
  Tables<"document_versions">,
  "id" | "name" | "hospital_name" | "position_title" | "job_url" | "created_at" | "html_content"
>;

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatGermanDate = (date: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const applyAnschreibenDate = (html: string, createdAt?: string | null) => {
  if (!createdAt) return html;
  const dateStr = formatGermanDate(new Date(createdAt));
  if (html.includes("{{DATE}}")) {
    return html.replaceAll("{{DATE}}", dateStr);
  }

  const rightAlignedParagraph = /(<p[^>]*text-align\s*:\s*right[^>]*>)([^<]*)(<\/p>)/i;
  const match = html.match(rightAlignedParagraph);
  if (match) {
    const hasDate = /\b\d{1,2}\.\d{1,2}\.\d{4}\b/.test(match[2]);
    if (hasDate || match[2].trim().length === 0) {
      return html.replace(rightAlignedParagraph, `$1${dateStr}$3`);
    }
  }

  return html.replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/, dateStr);
};

const AnschreibenPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveDocument, getLatestDocument } = useDocumentVersions();
  const {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    isLoading: isProfileLoading,
    userId,
  } = useProfile();
  const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGeneratingAnschreiben, setIsGeneratingAnschreiben] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [showSignatur, setShowSignatur] = useState(true);

  const [jobData, setJobData] = useState<ComposerJobData | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [anschreibenHtml, setAnschreibenHtml] = useState<string | null>(null);
  const [versions, setVersions] = useState<AnschreibenVersion[]>([]);

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

  const loadVersions = useCallback(async () => {
    if (!userId) return;

    setIsLoadingVersions(true);
    const { data, error } = await supabase
      .from("document_versions")
      .select("id, name, hospital_name, position_title, job_url, created_at, html_content")
      .eq("user_id", userId)
      .eq("typ", "Anschreiben")
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      toast({
        title: "Anschreiben konnten nicht geladen werden",
        description: error.message,
        variant: "destructive",
      });
      setVersions([]);
      setIsLoadingVersions(false);
      return;
    }

    setVersions((data ?? []) as AnschreibenVersion[]);
    setIsLoadingVersions(false);
  }, [toast, userId]);

  useEffect(() => {
    if (!userId) return;

    const loadInitialData = async () => {
      const latest = await getLatestDocument(userId, "Anschreiben");
      if (latest?.html_content) {
        setAnschreibenHtml(applyAnschreibenDate(latest.html_content, latest.created_at));
      }
      await loadVersions();
    };

    void loadInitialData();
  }, [getLatestDocument, loadVersions, userId]);

  useEffect(() => {
    if (!userId) return;
    void touchLastSeen(userId);
  }, [userId]);

  const handleGenerateAnschreiben = async (userPreferences?: string[]) => {
    if (!profile?.vorname || !profile?.nachname) {
      toast({
        title: "Profil unvollständig",
        description: "Bitte geben Sie mindestens Vorname und Nachname ein.",
        variant: "destructive",
      });
      return;
    }

    if (!jobData?.krankenhaus && !jobData?.fachabteilung) {
      toast({
        title: "Stellenanzeige fehlt",
        description: "Bitte geben Sie mindestens Krankenhaus oder Fachabteilung ein.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAnschreiben(true);
    try {
      const result = await generateAnschreiben({
        profile,
        workExperiences,
        educationEntries,
        practicalExperiences,
        certifications,
        publications,
        jobData,
        userPreferences,
      });

      if (!result.success || !result.html) {
        throw new Error(result.error || "Anschreiben konnte nicht erstellt werden.");
      }

      const htmlWithDate = applyAnschreibenDate(result.html, new Date().toISOString());
      setAnschreibenHtml(htmlWithDate);

      if (userId) {
        const saveResult = await saveDocument({
          userId,
          typ: "Anschreiben",
          htmlContent: result.html,
          hospitalName: jobData.krankenhaus,
          departmentOrSpecialty: jobData.fachabteilung,
          positionTitle: jobData.position,
          jobUrl: jobUrl || undefined,
          showFoto: false,
          showSignatur: true,
        });

        if (saveResult.success) {
          await loadVersions();
        }
      }

      void logEvent(
        "generate",
        {
          docType: "ANSCHREIBEN",
          source: "anschreiben_page",
          has_job_url: Boolean(jobUrl),
        },
        userId
      );
      void touchLastSeen(userId);

      toast({
        title: "Anschreiben erstellt",
        description: "Ihr Anschreiben wurde gespeichert und ist bereit für den Versand.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Anschreiben konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAnschreiben(false);
    }
  };

  const handleLoadVersion = (doc: AnschreibenVersion) => {
    setAnschreibenHtml(applyAnschreibenDate(doc.html_content, doc.created_at));
    toast({
      title: "Version geladen",
      description: "Die ausgewählte Version ist jetzt in der Vorschau sichtbar.",
    });
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('document_versions')
        .delete()
        .eq('id', versionId)
        .eq('user_id', userId); // Security: only delete own versions

      if (error) throw error;

      toast({
        title: "Version gelöscht",
        description: "Die Anschreiben-Version wurde erfolgreich entfernt.",
      });

      // Reload versions list
      await loadVersions();
    } catch (error) {
      console.error('Delete version error:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Version konnte nicht gelöscht werden.",
      });
    }
  };

  const handleExportPdf = async () => {
    if (!anschreibenHtml) return;

    setIsExporting(true);
    try {
      await downloadPdfFromServer({
        type: "anschreiben",
        htmlContent: anschreibenHtml,
        showFoto: false,
        showSignatur,
        signaturUrl,
        stadt: profile?.stadt,
        fileName: `Anschreiben_${profile?.nachname || "Arzt"}.pdf`,
      });

      void logEvent("export", { format: "PDF", docType: "ANSCHREIBEN", source: "anschreiben_page" }, userId);
      void touchLastSeen(userId);
    } catch (error) {
      toast({
        title: "PDF-Export fehlgeschlagen",
        description: error instanceof Error ? error.message : "Bitte erneut versuchen.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEnhancedHtmlUpdate = async (updatedHtml: string) => {
    const htmlWithDate = applyAnschreibenDate(updatedHtml, new Date().toISOString());
    setAnschreibenHtml(htmlWithDate);

    // Save the enhanced version
    if (userId && jobData) {
      await saveDocument({
        userId,
        typ: "Anschreiben",
        htmlContent: updatedHtml,
        hospitalName: jobData.krankenhaus,
        departmentOrSpecialty: jobData.fachabteilung,
        positionTitle: jobData.position,
        jobUrl: jobUrl || undefined,
        showFoto: false,
        showSignatur: true,
      });

      await loadVersions();
      void logEvent("enhance", { docType: "ANSCHREIBEN", source: "anschreiben_enhancer" }, userId);
    }
  };

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
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

      <div className="container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Anschreiben</h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 items-start max-w-full">
          <div className="space-y-6 min-w-0">
            <JobExtractionForm
              onJobDataExtracted={setJobData}
              jobData={jobData}
              setJobData={setJobData}
              onGenerateAnschreiben={handleGenerateAnschreiben}
              isGeneratingAnschreiben={isGeneratingAnschreiben}
              jobUrl={jobUrl}
              setJobUrl={setJobUrl}
              currentHtml={anschreibenHtml}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Letzte Versionen
                </CardTitle>
                <CardDescription>Neu laden oder weiterverwenden.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVersions ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-14 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : versions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                    Noch keine Version vorhanden.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-lg border p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.hospital_name || "Ohne Klinik"}
                            {doc.position_title ? ` · ${doc.position_title}` : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[11px]">
                              {formatDateTime(doc.created_at)}
                            </Badge>
                            {doc.job_url ? (
                              <Badge variant="outline" className="text-[11px]">
                                mit Stellenlink
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadVersion(doc)}
                          >
                            Laden
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVersion(doc.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="lg:sticky lg:top-24 lg:self-start min-w-0">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Vorschau Anschreiben
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch id="show-signature" checked={showSignatur} onCheckedChange={setShowSignatur} />
                  <Label htmlFor="show-signature" className="text-sm flex items-center gap-1">
                    <PenTool className="h-4 w-4" /> Signatur
                  </Label>
                </div>
              </div>
              <CardDescription>
                Vorschau und Export.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[400px] sm:h-[500px] lg:h-[600px] xl:h-[700px] rounded-lg border overflow-auto bg-gray-100">
                {anschreibenHtml ? (
                  <div className="p-2 flex justify-center items-start w-full min-h-full">
                    <CVTemplate
                      htmlContent={anschreibenHtml}
                      showFoto={false}
                      showSignatur={showSignatur}
                      signaturUrl={signaturUrl ?? undefined}
                      stadt={profile?.stadt}
                      paperClassName="anschreiben-paper"
                      useBasePaperClass={false}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-50" />
                    <p className="font-medium">Kein Anschreiben geladen</p>
                    <p className="text-sm">Links erstellen oder laden.</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleExportPdf}
                disabled={!anschreibenHtml || isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Als PDF herunterladen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnschreibenPage;
