import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useDocumentVersions } from "@/hooks/useDocumentVersions";
import { generateCV, generateAnschreiben, deleteAccount } from "@/lib/api/generation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Loader2, Trash2, Settings, ArrowRight } from "lucide-react";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

import JobExtractionForm from "@/components/generation/JobExtractionForm";
import DocumentPreview from "@/components/generation/DocumentPreview";
import DocumentVersionsList from "@/components/generation/DocumentVersionsList";
import AppFooter from "@/components/AppFooter";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import BrandLogo from "@/components/BrandLogo";
import { logEvent, touchLastSeen } from "@/lib/app-events";
import { useUserFileUrl } from "@/hooks/useUserFileUrl";

interface JobData {
  krankenhaus: string | null;
  standort: string | null;
  fachabteilung: string | null;
  position: string | null;
  ansprechpartner: string | null;
  anforderungen: string | null;
}

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

const Dashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cvHtml, setCvHtml] = useState<string | null>(null);
  const [anschreibenHtml, setAnschreibenHtml] = useState<string | null>(null);
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);
  const [isGeneratingAnschreiben, setIsGeneratingAnschreiben] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
  
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
    userId
  } = useProfile();
  const { url: profilePhotoUrl } = useUserFileUrl(profile?.foto_url);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load latest documents on mount
  useEffect(() => {
    const loadLatestDocuments = async () => {
      if (!userId) return;
      
      try {
        const [latestCv, latestAnschreiben] = await Promise.all([
          getLatestDocument(userId, "CV"),
          getLatestDocument(userId, "Anschreiben")
        ]);
        
        if (latestCv?.html_content) {
          setCvHtml(latestCv.html_content);
        }
        if (latestAnschreiben?.html_content) {
          setAnschreibenHtml(applyAnschreibenDate(latestAnschreiben.html_content, latestAnschreiben.created_at));
        }
      } catch (error) {
        console.error("Error loading latest documents:", error);
      }
    };

    loadLatestDocuments();
  }, [userId, getLatestDocument]);

  useEffect(() => {
    if (!userId) return;
    void touchLastSeen(userId);
  }, [userId]);

  const handleGenerateCV = async () => {
    if (!profile?.vorname || !profile?.nachname) {
      toast({
        title: "Profil unvollständig",
        description: "Bitte geben Sie mindestens Ihren Namen ein.",
        variant: "destructive"
      });
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
        publications
      });

      if (result.success && result.html) {
        setCvHtml(result.html);
        
        // Auto-save to database
        if (userId) {
          const saveResult = await saveDocument({
            userId,
            typ: "CV",
            htmlContent: result.html,
            showFoto: true,
            showSignatur: true
          });
          
          if (saveResult.success) {
            setDocumentRefreshTrigger((prev) => prev + 1);
          }
        }

        void logEvent("generate", { docType: "CV" }, userId);
        void touchLastSeen(userId);
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Lebenslauf konnte nicht erstellt werden.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Generate CV error:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingCV(false);
    }
  };

  const handleGenerateAnschreiben = async () => {
    if (!profile?.vorname || !profile?.nachname) {
      toast({
        title: "Profil unvollständig",
        description: "Bitte geben Sie mindestens Ihren Namen ein.",
        variant: "destructive"
      });
      return;
    }

    if (!jobData?.krankenhaus && !jobData?.fachabteilung) {
      toast({
        title: "Stellenanzeige fehlt",
        description: "Bitte fügen Sie Informationen zur Stelle hinzu.",
        variant: "destructive"
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
        jobData
      });

      if (result.success && result.html) {
        setAnschreibenHtml(result.html);
        
        // Auto-save to database with hospital metadata
        if (userId) {
          const saveResult = await saveDocument({
            userId,
            typ: "Anschreiben",
            htmlContent: result.html,
            hospitalName: jobData?.krankenhaus,
            departmentOrSpecialty: jobData?.fachabteilung,
            positionTitle: jobData?.position,
            jobUrl: jobUrl || undefined,
            showFoto: false,
            showSignatur: true
          });
          
          if (saveResult.success) {
            setDocumentRefreshTrigger((prev) => prev + 1);
          }
        }

        void logEvent("generate", { docType: "ANSCHREIBEN" }, userId);
        void touchLastSeen(userId);
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Anschreiben konnte nicht erstellt werden.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Generate Anschreiben error:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAnschreiben(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Fehler",
        description: "Abmeldung fehlgeschlagen.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Auf Wiedersehen!",
      });
      navigate("/");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount();
      
      if (result.success) {
        toast({
          title: "Konto gelöscht",
          description: "Ihr Konto und alle Daten wurden gelöscht."
        });
        await supabase.auth.signOut();
        navigate("/", { state: { accountDeleted: true } });
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Konto konnte nicht gelöscht werden.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleLoadDocument = (html: string, type: "cv" | "anschreiben", createdAt?: string | null) => {
    if (type === "cv") {
      setCvHtml(html);
    } else {
      setAnschreibenHtml(applyAnschreibenDate(html, createdAt));
    }
    toast({
      title: "Dokument geladen",
      description: `${type === "cv" ? "Lebenslauf" : "Anschreiben"} wurde in die Vorschau geladen.`
    });
  };

  const handleDocumentSaved = () => {
    setDocumentRefreshTrigger((prev) => prev + 1);
  };

  if (isLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-4">
            {/* Avatar and Greeting */}
            <div className="hidden md:flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profilePhotoUrl || undefined} alt={profile?.vorname || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {profile?.vorname?.[0]}{profile?.nachname?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                Hallo, {profile?.vorname || "User"}!
              </span>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/profil">
                <User className="mr-2 h-4 w-4" />
                Profil
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-24 pb-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
            Hallo{profile?.vorname ? `, ${profile.vorname}` : ""}.
          </h1>
          <DisclaimerBanner className="mt-4 max-w-2xl" />
        </div>

        {/* Main Dashboard Layout */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column - Input */}
          <div className="space-y-6 min-w-0">
            {/* Profile Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  Ihr Profil
                </CardTitle>
                <CardDescription>
                  {profile?.vorname && profile?.nachname 
                    ? `${profile.vorname} ${profile.nachname}`
                    : "Profil unvollständig"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/profil">
                    <Settings className="mr-2 h-4 w-4" />
                    Profil bearbeiten
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Job Extraction */}
            <JobExtractionForm
              onJobDataExtracted={setJobData}
              jobData={jobData}
              setJobData={setJobData}
              onGenerateAnschreiben={handleGenerateAnschreiben}
              isGeneratingAnschreiben={isGeneratingAnschreiben}
              jobUrl={jobUrl}
              setJobUrl={setJobUrl}
            />

            {/* Document Versions */}
            <DocumentVersionsList
              onLoadDocument={handleLoadDocument}
              userId={userId}
              refreshTrigger={documentRefreshTrigger}
            />

            {/* Danger Zone */}
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  DSGVO - Datenkontrolle
                </CardTitle>
              <CardDescription>
                Konto und Daten löschen
              </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Account & Daten löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Ihr Konto und alle gespeicherten 
                        Daten (Profil, Dokumente, Fotos) werden permanent gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeletingAccount ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Endgültig löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="min-w-0">
            <DocumentPreview
              cvHtml={cvHtml}
              anschreibenHtml={anschreibenHtml}
              profile={profile}
              isGeneratingCV={isGeneratingCV}
              isGeneratingAnschreiben={isGeneratingAnschreiben}
              onGenerateCV={handleGenerateCV}
              onGenerateAnschreiben={handleGenerateAnschreiben}
              canGenerateAnschreiben={!!(jobData?.krankenhaus || jobData?.fachabteilung)}
              jobData={jobData}
              jobUrl={jobUrl}
              userId={userId}
              onDocumentSaved={handleDocumentSaved}
            />
          </div>
        </div>

        <AppFooter />
      </div>
    </div>
  );
};

export default Dashboard;
