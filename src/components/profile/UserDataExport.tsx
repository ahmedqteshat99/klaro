import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function UserDataExport() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Fehler",
          description: "Sie müssen angemeldet sein, um Ihre Daten zu exportieren.",
          variant: "destructive",
        });
        return;
      }

      // Fetch all user data
      const [
        { data: profile },
        { data: workExperiences },
        { data: educationEntries },
        { data: practicalExperiences },
        { data: certifications },
        { data: publications },
        { data: customSections },
        { data: customSectionEntries },
        { data: userDocuments },
        { data: documentVersions },
        { data: applications },
        { data: notificationPreferences },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("work_experiences").select("*").eq("user_id", user.id),
        supabase.from("education_entries").select("*").eq("user_id", user.id),
        supabase.from("practical_experiences").select("*").eq("user_id", user.id),
        supabase.from("certifications").select("*").eq("user_id", user.id),
        supabase.from("publications").select("*").eq("user_id", user.id),
        supabase.from("custom_sections").select("*").eq("user_id", user.id),
        supabase.from("custom_section_entries").select("*").eq("user_id", user.id),
        supabase.from("user_documents").select("*").eq("user_id", user.id),
        supabase.from("document_versions").select("*").eq("user_id", user.id),
        supabase.from("applications").select("*").eq("user_id", user.id),
        supabase.from("user_notification_preferences").select("*").eq("user_id", user.id).single(),
      ]);

      // Compile all data into a single object
      const userData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportVersion: "1.0",
          userId: user.id,
          userEmail: user.email,
        },
        profile: profile || null,
        workExperiences: workExperiences || [],
        educationEntries: educationEntries || [],
        practicalExperiences: practicalExperiences || [],
        certifications: certifications || [],
        publications: publications || [],
        customSections: customSections || [],
        customSectionEntries: customSectionEntries || [],
        userDocuments: userDocuments || [],
        documentVersions: documentVersions || [],
        applications: applications || [],
        notificationPreferences: notificationPreferences || null,
        authUser: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at,
        },
      };

      // Create downloadable JSON file
      const jsonString = JSON.stringify(userData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `klaro-meine-daten-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Datenexport erfolgreich",
        description: "Ihre persönlichen Daten wurden als JSON-Datei heruntergeladen.",
      });
    } catch (error) {
      console.error("Error exporting user data:", error);
      toast({
        title: "Fehler beim Datenexport",
        description: "Beim Exportieren Ihrer Daten ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Datenexport
        </CardTitle>
        <CardDescription>
          Laden Sie alle Ihre persönlichen Daten herunter (DSGVO Art. 20 - Recht auf Datenübertragbarkeit)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Der Export enthält:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Profildaten (Name, Kontaktdaten, Berufsinformationen)</li>
            <li>Berufserfahrung, Ausbildung, Praktika</li>
            <li>Zertifikate, Publikationen, Fähigkeiten</li>
            <li>Generierte Dokumente (CV- und Anschreiben-Versionen)</li>
            <li>Bewerbungen und Kommunikationsverlauf</li>
            <li>E-Mail-Präferenzen und Benachrichtigungseinstellungen</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportiere Daten...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Alle Daten als JSON exportieren
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Die Datei wird im JSON-Format heruntergeladen und kann in andere Systeme importiert werden.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
