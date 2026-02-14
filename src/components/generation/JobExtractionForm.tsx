import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Loader2, Edit3, Search, FileEdit, AlertCircle } from "lucide-react";
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
  onGenerateAnschreiben?: () => void;
  isGeneratingAnschreiben?: boolean;
  jobUrl: string;
  setJobUrl: (url: string) => void;
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
  setJobUrl
}: JobExtractionFormProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [manualText, setManualText] = useState("");
  const { toast } = useToast();

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
        {/* URL Input with Extract button - HIDDEN for legal compliance */}
        {false && (
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
                disabled={isExtracting || !jobUrl.trim()}
                className="shrink-0 bg-neutral-900 text-white hover:bg-neutral-800 w-full sm:w-auto"
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Anschreiben generieren
                    <img
                      src="https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/claude-color.png"
                      alt="Claude"
                      className="h-4 w-4"
                    />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

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
            {/* Text extraction - HIDDEN for legal compliance */}
            {false && extractionFailed && (
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
                  disabled={isExtracting || !manualText.trim()}
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
            )}

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
                  onClick={onGenerateAnschreiben}
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
                      Anschreiben generieren
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobExtractionForm;
