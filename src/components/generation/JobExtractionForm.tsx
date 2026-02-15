import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link2, Loader2, Edit3, Search, FileEdit, AlertCircle, Sparkles, Send, Trash2 } from "lucide-react";
import { extractJobData } from "@/lib/api/generation";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobData {
  krankenhaus: string | null;
  standort: string | null;
  fachabteilung: string | null;
  position: string | null;
  ansprechpartner: string | null;
  anforderungen: string | null;
}

interface JobExtractionFormProps {
  onJobDataExtracted: (data: JobData) => void;
  jobData: JobData | null;
  setJobData: (data: JobData) => void;
  onGenerateAnschreiben?: (userPreferences?: string[]) => void;
  isGeneratingAnschreiben?: boolean;
  jobUrl: string;
  setJobUrl: (url: string) => void;
  currentHtml?: string | null;
}

const emptyJobData: JobData = {
  krankenhaus: "",
  standort: "",
  fachabteilung: "",
  position: "",
  ansprechpartner: "",
  anforderungen: ""
};

const jobFields: Array<{ key: keyof JobData; label: string }> = [
  { key: "krankenhaus", label: "Krankenhaus" },
  { key: "standort", label: "Standort" },
  { key: "fachabteilung", label: "Fachabteilung" },
  { key: "position", label: "Position" },
  { key: "ansprechpartner", label: "Ansprechpartner" },
  { key: "anforderungen", label: "Anforderungen" }
];

const JobExtractionForm = ({
  onJobDataExtracted,
  jobData,
  setJobData,
  onGenerateAnschreiben,
  isGeneratingAnschreiben,
  jobUrl,
  setJobUrl,
  currentHtml,
}: JobExtractionFormProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false); // Default to false
  const [showManualForm, setShowManualForm] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [manualText, setManualText] = useState("");
  const { toast } = useToast();

  // User preferences state (collected before generation)
  const [userPreferences, setUserPreferences] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleExtract = async () => {
    if (!jobUrl.trim()) {
      toast({
        title: "URL fehlt",
        description: "Bitte geben Sie eine Stellenanzeigen-URL ein.",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    setExtractionFailed(false);
    try {
      const result = await extractJobData({ url: jobUrl });

      if (result.success && result.data) {
        setJobData(result.data);
        onJobDataExtracted(result.data);
        toast({
          title: "Erfolgreich extrahiert",
          description: "Die Stellenanzeige wurde analysiert. Sie können die Felder bearbeiten."
        });
        setShowManualForm(true);
        setExtractionFailed(false);
      } else {
        setExtractionFailed(true);
        toast({
          title: "Extraktion fehlgeschlagen",
          description: "Bitte geben Sie die Daten manuell ein oder fügen Sie den Text der Stellenanzeige ein.",
          variant: "destructive"
        });
        setShowManualForm(true);
        setJobData(emptyJobData);
      }
    } catch (error) {
      console.error("Extraction error:", error);
      setExtractionFailed(true);
      toast({
        title: "Fehler",
        description: "Stellenanzeige konnte nicht geladen werden. Bitte manuell eingeben.",
        variant: "destructive"
      });
      setShowManualForm(true);
      setJobData(emptyJobData);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!manualText.trim()) {
      toast({
        title: "Text fehlt",
        description: "Bitte fügen Sie den Text der Stellenanzeige ein.",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    setExtractionFailed(false);
    try {
      const result = await extractJobData({ rawText: manualText });

      if (result.success && result.data) {
        setJobData(result.data);
        onJobDataExtracted(result.data);
        toast({
          title: "Text analysiert",
          description: "Die Felder wurden aus dem Text befüllt. Sie können sie anpassen."
        });
        setShowManualForm(true);
      } else {
        setExtractionFailed(true);
        toast({
          title: "Extraktion fehlgeschlagen",
          description: "Bitte füllen Sie die Felder manuell aus.",
          variant: "destructive"
        });
        setShowManualForm(true);
      }
    } catch (error) {
      console.error("Text extraction error:", error);
      setExtractionFailed(true);
      toast({
        title: "Fehler",
        description: "Text konnte nicht verarbeitet werden. Bitte manuell eingeben.",
        variant: "destructive"
      });
      setShowManualForm(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualEntry = () => {
    setShowManualForm(true);
    setJobData(emptyJobData);
  };

  const updateField = (field: keyof JobData, value: string) => {
    if (jobData) {
      const updated = { ...jobData, [field]: value };
      setJobData(updated);
      onJobDataExtracted(updated);
    }
  };

  const canGenerate = jobData?.krankenhaus || jobData?.fachabteilung;

  // Auto-scroll to bottom when preferences change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [userPreferences]);

  const handleAddPreference = () => {
    if (!inputValue.trim()) return;

    setUserPreferences((prev) => [...prev, inputValue.trim()]);
    setInputValue("");
    textareaRef.current?.focus();
  };

  const handleRemovePreference = (index: number) => {
    setUserPreferences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearPreferences = () => {
    setUserPreferences([]);
    toast({
      title: "Präferenzen gelöscht",
      description: "Alle Präferenzen wurden zurückgesetzt.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddPreference();
    }
  };

  const handleGenerate = () => {
    if (onGenerateAnschreiben) {
      // Pass user preferences to the generation function
      onGenerateAnschreiben(userPreferences.length > 0 ? userPreferences : undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Stellenanzeige
        </CardTitle>
        <CardDescription>
          Link einfügen oder manuell.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-3 mb-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              ⚠️ Wichtiger Hinweis zur KI-Haftung
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Die KI generiert Texte auf Basis Ihrer Angaben, kann aber <strong>Fehler, Ungenauigkeiten
              oder unangemessene Formulierungen</strong> enthalten. Sie sind <strong>selbst verantwortlich</strong> für
              die Richtigkeit, Vollständigkeit und Angemessenheit aller Bewerbungsunterlagen, die Sie
              an Arbeitgeber senden.
            </p>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              <strong>Sie MÜSSEN alle KI-generierten Inhalte vor der Verwendung sorgfältig prüfen und ggf. anpassen.</strong>
            </p>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="legal-consent"
              checked={legalConsent}
              onCheckedChange={(checked) => setLegalConsent(checked as boolean)}
            />
            <Label htmlFor="legal-consent" className="text-sm font-normal cursor-pointer leading-relaxed text-amber-900 dark:text-amber-200">
              Ich habe den Hinweis gelesen und verstanden. Ich willige ein, dass meine Profildaten zur KI-gestützten Textgenerierung
              an Anthropic übermittelt werden. Ich bestätige, dass ich berechtigt bin, diese Stellenanzeige für meine persönliche
              Bewerbung zu verwenden und mir bewusst ist, dass die Daten nur temporär verarbeitet werden.
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobUrl">Stellenanzeigen-URL</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="jobUrl"
              type="url"
              inputMode="url"
              autoComplete="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://stellenanzeige.de/arzt-stelle..."
              disabled={isExtracting}
            />
            <Button
              onClick={handleExtract}
              disabled={isExtracting || !jobUrl.trim() || !legalConsent}
              className="shrink-0 bg-neutral-900 text-white hover:bg-neutral-800 w-full sm:w-auto"
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Daten abrufen
                  <Sparkles className="h-4 w-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
          {!legalConsent && jobUrl.length > 0 && (
            <p className="text-xs text-destructive animate-pulse">
              Bitte bestätigen Sie oben die private Nutzung.
            </p>
          )}
        </div>

        {!showManualForm && (
          <Button variant="link" onClick={handleManualEntry} className="px-0">
            <Edit3 className="mr-2 h-4 w-4" />
            Daten manuell eingeben
          </Button>
        )}

        {/* Fallback textarea when extraction fails */}
        {extractionFailed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Die automatische Extraktion war nicht erfolgreich. Sie können den Text der Stellenanzeige unten einfügen
              oder die Felder manuell ausfüllen.
            </AlertDescription>
          </Alert>
        )}

        {showManualForm && (
          <div className="space-y-4 pt-4 border-t">
            {/* Text extraction enabled */}
            <div className="space-y-2">
              <Label htmlFor="manualText">Stellenanzeigen-Text (optional)</Label>
              <Textarea
                id="manualText"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Fügen Sie hier den gesamten Text der Stellenanzeige ein..."
                rows={4}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleExtractFromText}
                disabled={isExtracting || !manualText.trim() || !legalConsent}
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analysiere Text...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Text analysieren
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="krankenhaus">Krankenhaus / Klinik</Label>
                <Input
                  id="krankenhaus"
                  value={jobData?.krankenhaus || ""}
                  onChange={(e) => updateField("krankenhaus", e.target.value)}
                  placeholder="z.B. Universitätsklinikum Heidelberg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standort">Standort</Label>
                <Input
                  id="standort"
                  value={jobData?.standort || ""}
                  onChange={(e) => updateField("standort", e.target.value)}
                  placeholder="z.B. Heidelberg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fachabteilung">Fachabteilung</Label>
                <Input
                  id="fachabteilung"
                  value={jobData?.fachabteilung || ""}
                  onChange={(e) => updateField("fachabteilung", e.target.value)}
                  placeholder="z.B. Innere Medizin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={jobData?.position || ""}
                  onChange={(e) => updateField("position", e.target.value)}
                  placeholder="z.B. Assistenzarzt (m/w/d)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ansprechpartner">Ansprechpartner</Label>
              <Input
                id="ansprechpartner"
                value={jobData?.ansprechpartner || ""}
                onChange={(e) => updateField("ansprechpartner", e.target.value)}
                placeholder="z.B. Prof. Dr. med. Max Mustermann"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anforderungen">Anforderungen (Zusammenfassung)</Label>
              <Textarea
                id="anforderungen"
                value={jobData?.anforderungen || ""}
                onChange={(e) => updateField("anforderungen", e.target.value)}
                placeholder="Wichtigste Anforderungen aus der Stellenanzeige..."
                rows={3}
              />
            </div>

            {/* Generate Anschreiben Button */}
            {onGenerateAnschreiben && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleGenerate}
                  disabled={isGeneratingAnschreiben || !canGenerate}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingAnschreiben ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generiere Anschreiben...
                    </>
                  ) : (
                    <>
                      <FileEdit className="mr-2 h-4 w-4" />
                      {userPreferences.length > 0
                        ? `Anschreiben generieren (${userPreferences.length} Präferenz${userPreferences.length > 1 ? 'en' : ''})`
                        : "Anschreiben generieren"}
                    </>
                  )}
                </Button>
                {!canGenerate && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Bitte geben Sie mindestens das Krankenhaus oder die Fachabteilung ein.
                  </p>
                )}
              </div>
            )}

            {/* AI Preferences Section */}
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Anschreiben-Präferenzen (optional)
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Beschreiben Sie, wie Ihr Anschreiben gestaltet werden soll
                      </p>
                    </div>
                    {userPreferences.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearPreferences}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Preferences Display */}
                  {userPreferences.length > 0 && (
                    <ScrollArea ref={scrollAreaRef} className="h-[200px] pr-4">
                      <div className="space-y-2">
                        {userPreferences.map((pref, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3"
                          >
                            <Badge variant="secondary" className="shrink-0 mt-0.5">
                              {index + 1}
                            </Badge>
                            <p className="text-sm flex-1">{pref}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePreference(index)}
                              className="h-6 w-6 p-0 shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Suggestions when no preferences */}
                  {userPreferences.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Beispiele für Präferenzen:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          "Mach es sehr formal und professionell",
                          "Betone meine Kardiologie-Erfahrung stark",
                          "Halte es kurz - maximal eine Seite",
                          "Erwähne meine Forschungserfahrung",
                        ].map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="justify-start text-left h-auto py-2 px-3"
                            onClick={() => setInputValue(suggestion)}
                          >
                            <Badge variant="secondary" className="mr-2 shrink-0 text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-xs">{suggestion}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="space-y-2">
                    <Textarea
                      ref={textareaRef}
                      placeholder="z.B. 'Betone meine Kardiologie-Erfahrung' oder 'Halte es sehr formal' oder 'Erwähne meine Forschung'"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[70px] resize-none text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Enter zum Hinzufügen • Präferenzen werden beim Generieren berücksichtigt
                      </p>
                      <Button
                        onClick={handleAddPreference}
                        disabled={!inputValue.trim()}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                        <span className="ml-2">Hinzufügen</span>
                      </Button>
                    </div>
                  </div>
                </div>
            </>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobExtractionForm;
