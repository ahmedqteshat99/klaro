import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useDocumentVersions } from "@/hooks/useDocumentVersions";
import { generateCV, generateAnschreiben } from "@/lib/api/generation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    FileText, Upload, Camera, PenTool, Sparkles, FileEdit,
    ChevronRight, SkipForward, Loader2, CheckCircle2, ArrowLeft
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { logEvent, touchLastSeen } from "@/lib/app-events";
import { useUserFileUrl } from "@/hooks/useUserFileUrl";

const CvImportCard = lazy(() => import("@/components/profile/CvImportCard"));
const PhotoUpload = lazy(() => import("@/components/profile/PhotoUpload"));
const SignatureCanvas = lazy(() => import("@/components/profile/SignatureCanvas"));
const CVTemplate = lazy(() => import("@/components/cv/CVTemplate"));
const JobExtractionForm = lazy(() => import("@/components/generation/JobExtractionForm"));

const ONBOARDING_KEY = "onboarding_done";
const TOTAL_STEPS = 5;

const STEPS = [
    {
        number: 1,
        title: "Daten eingeben",
        subtitle: "Laden Sie Ihren Lebenslauf hoch oder geben Sie Ihre Daten manuell ein.",
        icon: Upload,
    },
    {
        number: 2,
        title: "Foto & Unterschrift",
        subtitle: "Fügen Sie Ihr Bewerbungsfoto und Ihre Unterschrift hinzu.",
        icon: Camera,
    },
    {
        number: 3,
        title: "Lebenslauf generieren",
        subtitle: "Erstellen Sie Ihren ersten professionellen Lebenslauf.",
        icon: FileText,
    },
    {
        number: 4,
        title: "Anschreiben erstellen",
        subtitle: "Erstellen Sie Ihr erstes Bewerbungsanschreiben für eine Stelle.",
        icon: FileEdit,
    },
    {
        number: 5,
        title: "Fertig!",
        subtitle: "Sie sind bereit, Bewerbungen zu erstellen.",
        icon: Sparkles,
    },
];

export const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
};

export const isOnboardingDone = () => {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
};

const OnboardingPage = () => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [cvHtml, setCvHtml] = useState<string | null>(null);
    const [isGeneratingCV, setIsGeneratingCV] = useState(false);
    const [anschreibenHtml, setAnschreibenHtml] = useState<string | null>(null);
    const [isGeneratingAnschreiben, setIsGeneratingAnschreiben] = useState(false);
    const [jobData, setJobData] = useState<{
        krankenhaus: string | null;
        standort: string | null;
        fachabteilung: string | null;
        position: string | null;
        ansprechpartner: string | null;
        anforderungen: string | null;
    } | null>(null);
    const [jobUrl, setJobUrl] = useState("");

    const navigate = useNavigate();
    const { toast } = useToast();
    const { saveDocument } = useDocumentVersions();

    const {
        profile,
        workExperiences,
        educationEntries,
        practicalExperiences,
        certifications,
        publications,
        isLoading: isProfileLoading,
        userId,
        saveProfile,
        updateLocalProfile,
        addWorkExperience,
        addWorkExperiencesLocal,
        addEducation,
        addEducationEntriesLocal,
        addPracticalExperience,
        addPracticalExperiencesLocal,
        addCertification,
        addCertificationsLocal,
        addPublication,
        addPublicationsLocal,
        addCustomSection,
        addCustomSectionEntry,
    } = useProfile();

    const { url: fotoUrl } = useUserFileUrl(profile?.foto_url);
    const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

    // Auth check
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                navigate("/auth");
            }
            setIsLoading(false);
        });
    }, [navigate]);

    const handleNext = () => {
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        } else {
            finishOnboarding();
        }
    };

    const handleSkip = () => {
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        } else {
            finishOnboarding();
        }
    };

    const finishOnboarding = () => {
        completeOnboarding();
        navigate("/dashboard");
    };

    const handleGenerateCV = async () => {
        if (!profile?.vorname || !profile?.nachname) {
            toast({
                title: "Profil unvollständig",
                description: "Bitte geben Sie mindestens Ihren Namen auf der Profilseite ein.",
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

                if (userId) {
                    await saveDocument({
                        userId,
                        typ: "CV",
                        htmlContent: result.html,
                        showFoto: true,
                        showSignatur: true
                    });
                }

                void logEvent("generate", { docType: "CV", source: "onboarding" }, userId);
                void touchLastSeen(userId);

                toast({
                    title: "Lebenslauf erstellt! 🎉",
                    description: "Ihr erster Lebenslauf wurde erfolgreich generiert."
                });
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

                if (userId) {
                    await saveDocument({
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
                }

                void logEvent("generate", { docType: "Anschreiben", source: "onboarding" }, userId);
                void touchLastSeen(userId);

                toast({
                    title: "Anschreiben erstellt! 🎉",
                    description: "Ihr erstes Bewerbungsanschreiben wurde generiert."
                });
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

    if (isLoading || isProfileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            {/* Header */}
            <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <BrandLogo />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={finishOnboarding}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Einführung überspringen
                    </Button>
                </div>
            </nav>

            {/* Progress Bar */}
            <div className="container mx-auto px-4 pt-6 pb-2">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        {STEPS.map((s, i) => (
                            <div key={s.number} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                      transition-all duration-300
                      ${step > s.number
                                                ? "bg-primary text-primary-foreground"
                                                : step === s.number
                                                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                                                    : "bg-muted text-muted-foreground"
                                            }
                    `}
                                    >
                                        {step > s.number ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            s.number
                                        )}
                                    </div>
                                    <span className={`text-xs mt-1.5 whitespace-nowrap hidden sm:block ${step >= s.number ? "text-foreground font-medium" : "text-muted-foreground"
                                        }`}>
                                        {s.title}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] sm:mt-[-0.5rem] rounded-full transition-colors duration-300 ${step > s.number ? "bg-primary" : "bg-muted"
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Step Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="max-w-3xl mx-auto">
                    {/* Step Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                            {(() => {
                                const Icon = STEPS[step - 1].icon;
                                return <Icon className="h-8 w-8" />;
                            })()}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                            {STEPS[step - 1].title}
                        </h1>
                        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
                            {STEPS[step - 1].subtitle}
                        </p>
                    </div>

                    {/* Step Body */}
                    <Suspense fallback={
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        {step === 1 && (
                            <div className="space-y-6">
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

                                <Card className="border-dashed">
                                    <CardContent className="flex items-center justify-between py-5">
                                        <div>
                                            <p className="font-medium text-foreground">Lieber manuell eingeben?</p>
                                            <p className="text-sm text-muted-foreground">
                                                Öffnen Sie die Profilseite und füllen Sie Ihre Daten aus.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate("/profil")}
                                        >
                                            <PenTool className="mr-2 h-4 w-4" />
                                            Profilseite öffnen
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PhotoUpload
                                    profile={profile}
                                    userId={userId}
                                    onSave={saveProfile}
                                />
                                <SignatureCanvas
                                    profile={profile}
                                    userId={userId}
                                    onSave={saveProfile}
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                {!cvHtml ? (
                                    <Card>
                                        <CardHeader className="text-center">
                                            <CardTitle>Ihren ersten Lebenslauf erstellen</CardTitle>
                                            <CardDescription>
                                                Klicken Sie auf den Button, um Ihren professionellen Lebenslauf mit KI zu generieren.
                                                {(!profile?.vorname || !profile?.nachname) && (
                                                    <span className="block mt-2 text-destructive">
                                                        ⚠️ Bitte geben Sie zuerst Ihren Namen auf der Profilseite ein.
                                                    </span>
                                                )}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center gap-4 pb-8">
                                            <Button
                                                size="lg"
                                                onClick={handleGenerateCV}
                                                disabled={isGeneratingCV}
                                                className="px-8"
                                            >
                                                {isGeneratingCV ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Wird erstellt...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="mr-2 h-5 w-5" />
                                                        Lebenslauf generieren
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="font-medium">Ihr Lebenslauf wurde erfolgreich erstellt!</span>
                                        </div>
                                        <div className="bg-gray-100 rounded-lg p-4 overflow-auto max-h-[500px] border">
                                            <CVTemplate
                                                htmlContent={cvHtml}
                                                showFoto={!!profile?.foto_url}
                                                fotoUrl={fotoUrl ?? undefined}
                                                showSignatur={!!profile?.signatur_url}
                                                signaturUrl={signaturUrl ?? undefined}
                                                stadt={profile?.stadt}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            Ihr Lebenslauf wurde gespeichert. Sie können ihn jederzeit im Dashboard als PDF herunterladen.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                {!anschreibenHtml ? (
                                    <>
                                        <JobExtractionForm
                                            onJobDataExtracted={(data) => setJobData(data)}
                                            jobData={jobData}
                                            setJobData={setJobData}
                                            onGenerateAnschreiben={handleGenerateAnschreiben}
                                            isGeneratingAnschreiben={isGeneratingAnschreiben}
                                            jobUrl={jobUrl}
                                            setJobUrl={setJobUrl}
                                        />
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="font-medium">Ihr Anschreiben wurde erfolgreich erstellt!</span>
                                        </div>
                                        <Card>
                                            <CardContent className="py-6">
                                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: anschreibenHtml }} />
                                            </CardContent>
                                        </Card>
                                        <p className="text-sm text-muted-foreground text-center">
                                            Ihr Anschreiben wurde gespeichert. Sie können es im Dashboard als PDF herunterladen.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 5 && (
                            <Card>
                                <CardHeader className="text-center pb-4">
                                    <div className="flex justify-center mb-4">
                                        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl">Alles eingerichtet! 🎉</CardTitle>
                                    <CardDescription className="text-base max-w-md mx-auto mt-2">
                                        Sie sind bereit, um professionelle Bewerbungen zu erstellen.
                                        Im Dashboard können Sie Ihren Lebenslauf bearbeiten, Anschreiben generieren und alles als PDF herunterladen.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-3 pb-8">
                                    <Button size="lg" onClick={finishOnboarding} className="px-8">
                                        Zum Dashboard
                                        <ChevronRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </Suspense>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t">
                        <Button
                            variant="ghost"
                            onClick={() => setStep(Math.max(1, step - 1))}
                            disabled={step === 1}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Zurück
                        </Button>

                        <div className="flex items-center gap-3">
                            {step < TOTAL_STEPS && (
                                <Button
                                    variant="ghost"
                                    onClick={handleSkip}
                                    className="text-muted-foreground"
                                >
                                    Überspringen
                                    <SkipForward className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                            {step < TOTAL_STEPS ? (
                                <Button onClick={handleNext}>
                                    Weiter
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button onClick={finishOnboarding}>
                                    Zum Dashboard
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
