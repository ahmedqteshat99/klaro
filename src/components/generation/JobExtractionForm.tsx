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
import { Link2, Loader2, Edit3, Search, FileEdit, AlertCircle, Sparkles, MessageCircle, Send, Trash2 } from "lucide-react";
import { extractJobData, enhanceAnschreiben } from "@/lib/api/generation";
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

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface JobExtractionFormProps {
  onJobDataExtracted: (data: JobData) => void;
  jobData: JobData | null;
  setJobData: (data: JobData) => void;
  onGenerateAnschreiben?: () => void;
  isGeneratingAnschreiben?: boolean;
  jobUrl: string;
  setJobUrl: (url: string) => void;
  currentHtml?: string | null;
  onHtmlUpdated?: (html: string) => void;
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
  onHtmlUpdated
}: JobExtractionFormProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false); // Default to false
  const [showManualForm, setShowManualForm] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [manualText, setManualText] = useState("");
  const { toast } = useToast();

  // Enhancer state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !onHtmlUpdated) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await enhanceAnschreiben({
        currentHtml: currentHtml || null,
        userMessage: userMessage.content,
        conversationHistory,
      });

      if (!result.success || !result.message) {
        throw new Error(result.error || "Konnte keine Antwort generieren");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If HTML was updated, notify parent
      if (result.updatedHtml) {
        onHtmlUpdated(result.updatedHtml);
        toast({
          title: "Anschreiben aktualisiert",
          description: "Die Änderungen wurden in der Vorschau übernommen.",
        });
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Anfrage konnte nicht verarbeitet werden.",
        variant: "destructive",
      });

      const errorMessage: Message = {
        role: "assistant",
        content: "Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      textareaRef.current?.focus();
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    toast({
      title: "Konversation gelöscht",
      description: "Der Chat-Verlauf wurde zurückgesetzt.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <div className="bg-muted/30 p-3 rounded-md border border-border/50 mb-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="legal-consent"
              checked={legalConsent}
              onCheckedChange={(checked) => setLegalConsent(checked as boolean)}
            />
            <Label htmlFor="legal-consent" className="text-xs text-muted-foreground leading-normal cursor-pointer">
              Ich bestätige, dass ich berechtigt bin, diese Stellenanzeige für meine <strong>persönliche Bewerbung</strong> zu verwenden.
              Mir ist bewusst, dass Klaro die Daten nur <strong>temporär verarbeitet</strong> und nicht dauerhaft speichert.
              (Automatisches Auslesen via Firecrawl/AI).
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

            {/* AI Enhancement Section */}
            {onHtmlUpdated && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Anschreiben verbessern
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentHtml
                          ? "Sagen Sie mir, wie ich Ihr Anschreiben verbessern soll"
                          : "Beschreiben Sie, was Ihr Anschreiben enthalten soll"}
                      </p>
                    </div>
                    {messages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearConversation}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Messages Display */}
                  {messages.length > 0 && (
                    <ScrollArea ref={scrollAreaRef} className="h-[280px] pr-4">
                      <div className="space-y-3">
                        {messages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                {msg.role === "assistant" && (
                                  <MessageCircle className="h-3 w-3 opacity-70" />
                                )}
                                <span className="text-xs opacity-70">{formatTime(msg.timestamp)}</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Suggestions when no messages */}
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Beispiele:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          "Mach es formaler und professioneller",
                          "Betone mehr meine Erfahrung in der Kardiologie",
                          "Kürze es auf eine Seite",
                        ].map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="justify-start text-left h-auto py-2 px-3"
                            onClick={() => setInputValue(suggestion)}
                            disabled={isProcessing}
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
                      placeholder={
                        currentHtml
                          ? "z.B. 'Mach es formaler' oder 'Betone meine Kardiologie-Erfahrung'"
                          : "z.B. 'Erstelle ein Anschreiben für eine Assistenzarztstelle in der Inneren Medizin'"
                      }
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isProcessing}
                      className="min-h-[70px] resize-none text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Enter zum Senden, Shift+Enter für neue Zeile
                      </p>
                      <Button
                        onClick={handleSendMessage}
                        disabled={isProcessing || !inputValue.trim()}
                        size="sm"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span className="ml-2">Senden</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobExtractionForm;
