import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FileEdit, Download, Loader2, Image, PenTool } from "lucide-react";
import { exportToPDF } from "@/lib/pdf-export";
import { exportToDocx } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@/hooks/useProfile";
import CVTemplate from "@/components/cv/CVTemplate";
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

interface DocumentPreviewProps {
  cvHtml: string | null;
  anschreibenHtml: string | null;
  profile: Profile | null;
  isGeneratingCV: boolean;
  isGeneratingAnschreiben: boolean;
  onGenerateCV: () => void;
  onGenerateAnschreiben: () => void;
  canGenerateAnschreiben: boolean;
  jobData?: JobData | null;
  jobUrl?: string;
  userId: string | null;
  onDocumentSaved?: () => void;
}

const DocumentPreview = ({
  cvHtml,
  anschreibenHtml,
  profile,
  isGeneratingCV,
  isGeneratingAnschreiben,
  onGenerateCV,
  onGenerateAnschreiben,
  canGenerateAnschreiben,
  userId
}: DocumentPreviewProps) => {
  const [showFoto, setShowFoto] = useState(true);
  const [showSignatur, setShowSignatur] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { url: fotoUrl } = useUserFileUrl(profile?.foto_url);
  const { url: signaturUrl } = useUserFileUrl(profile?.signatur_url);

  const handleExportPDF = async (type: "cv" | "anschreiben") => {
    const html = type === "cv" ? cvHtml : anschreibenHtml;
    if (!html) return;

    setIsExporting(true);
    try {
      const fileName = type === "cv"
        ? `Lebenslauf_${profile?.nachname || "Arzt"}`
        : `Anschreiben_${profile?.nachname || "Arzt"}`;

      await exportToPDF({
        htmlContent: html,
        fileName,
        showFoto: type === "cv" ? showFoto : false,
        fotoUrl,
        showSignatur,
        signaturUrl,
        stadt: profile?.stadt
      });

      void logEvent(
        "export",
        { format: "PDF", docType: type === "cv" ? "CV" : "ANSCHREIBEN" },
        userId
      );
      void touchLastSeen(userId);

      toast({
        title: "PDF Druckvorschau",
        description: "Bitte wählen Sie 'Als PDF speichern' im Druckdialog."
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "PDF konnte nicht erstellt werden.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = async (type: "cv" | "anschreiben") => {
    const html = type === "cv" ? cvHtml : anschreibenHtml;
    if (!html) return;

    setIsExporting(true);
    try {
      const fileName = type === "cv"
        ? `Lebenslauf_${profile?.nachname || "Arzt"}`
        : `Anschreiben_${profile?.nachname || "Arzt"}`;

      await exportToDocx(
        html,
        fileName,
        type === "cv" ? showFoto : false,
        fotoUrl ?? undefined,
        showSignatur,
        signaturUrl ?? undefined,
        profile?.stadt
      );

      void logEvent(
        "export",
        { format: "DOCX", docType: type === "cv" ? "CV" : "ANSCHREIBEN" },
        userId
      );
      void touchLastSeen(userId);

      toast({ title: "DOCX erstellt", description: `${fileName}.docx wurde heruntergeladen.` });
    } catch (error) {
      console.error("DOCX export error:", error);
      toast({ title: "Fehler", description: "DOCX konnte nicht erstellt werden.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Vorschau</CardTitle>
      </CardHeader>
      <div className="flex-1 flex flex-col px-6 pb-6 min-h-0">
        <Tabs defaultValue="cv" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cv">Mein Lebenslauf</TabsTrigger>
            <TabsTrigger value="anschreiben">Mein Anschreiben</TabsTrigger>
          </TabsList>

          <TabsContent value="cv" className="flex flex-col mt-4 space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Switch id="showFoto" checked={showFoto} onCheckedChange={setShowFoto} />
                <Label htmlFor="showFoto" className="flex items-center gap-1 text-sm">
                  <Image className="h-4 w-4" /> Foto
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="showSignatur" checked={showSignatur} onCheckedChange={setShowSignatur} />
                <Label htmlFor="showSignatur" className="flex items-center gap-1 text-sm">
                  <PenTool className="h-4 w-4" /> Signatur
                </Label>
              </div>
            </div>

            {/* Preview - uses shared CVTemplate with A4 paper dimensions */}
            <div className="w-full">
              <ScrollArea className="max-h-[600px] rounded-lg border overflow-auto">
                {cvHtml ? (
                  <div className="cv-paper-wrapper bg-gray-100 p-4">
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
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Noch kein Lebenslauf erstellt</p>
                    <p className="text-sm text-center mb-4">
                      Klicken Sie auf "Generieren", um Ihren Lebenslauf zu erstellen.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onGenerateCV} disabled={isGeneratingCV}>
                {isGeneratingCV ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Lebenslauf generieren
                  </>
                )}
              </Button>
              {cvHtml && (
                <>
                  <Button variant="outline" onClick={() => handleExportPDF("cv")} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleExportDocx("cv")} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    DOCX
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Texte werden automatisch mit KI auf Basis Ihrer Angaben erstellt.
            </p>
          </TabsContent>

          <TabsContent value="anschreiben" className="flex flex-col mt-4 space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Switch id="showSignatur2" checked={showSignatur} onCheckedChange={setShowSignatur} />
                <Label htmlFor="showSignatur2" className="flex items-center gap-1 text-sm">
                  <PenTool className="h-4 w-4" /> Signatur
                </Label>
              </div>
            </div>

            {/* Preview */}
            <div className="w-full">
              <ScrollArea className="max-h-[600px] rounded-lg border overflow-auto">
                {anschreibenHtml ? (
                  <div className="bg-gray-100 p-4 flex items-start">
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
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                    <FileEdit className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Noch kein Anschreiben erstellt</p>
                    <p className="text-sm text-center mb-4">
                      Fügen Sie eine Stellenanzeige hinzu und generieren Sie Ihr Anschreiben.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={onGenerateAnschreiben}
                disabled={isGeneratingAnschreiben || !canGenerateAnschreiben}
              >
                {isGeneratingAnschreiben ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Anschreiben generieren
                  </>
                )}
              </Button>
              {anschreibenHtml && (
                <>
                  <Button variant="outline" onClick={() => handleExportPDF("anschreiben")} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleExportDocx("anschreiben")} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    DOCX
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Texte werden automatisch mit KI auf Basis Ihrer Angaben erstellt.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

export default DocumentPreview;
