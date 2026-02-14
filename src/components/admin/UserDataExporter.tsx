import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Search, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function UserDataExporter() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const handleSearch = async () => {
    if (!email) {
      toast({
        title: "E-Mail erforderlich",
        description: "Bitte geben Sie eine E-Mail-Adresse ein.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Find user by email
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error || !profile) {
        toast({
          title: "Benutzer nicht gefunden",
          description: "Es wurde kein Benutzer mit dieser E-Mail-Adresse gefunden.",
          variant: "destructive",
        });
        setUserData(null);
        return;
      }

      setUserData(profile);
      toast({
        title: "Benutzer gefunden",
        description: `${profile.vorname} ${profile.nachname} (${profile.email})`,
      });

      // Log admin action
      await supabase.rpc("log_admin_action", {
        p_action: "view_profile",
        p_target_user_id: profile.user_id,
        p_target_table: "profiles",
        p_target_record_id: profile.user_id,
        p_query_details: { searched_email: email },
      });
    } catch (error) {
      console.error("Error searching user:", error);
      toast({
        title: "Fehler bei der Suche",
        description: "Beim Suchen des Benutzers ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = async () => {
    if (!userData) return;

    setIsExporting(true);
    try {
      const userId = userData.user_id;

      // Fetch all user data (same as UserDataExport component)
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
        { data: emailAliases },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("work_experiences").select("*").eq("user_id", userId),
        supabase.from("education_entries").select("*").eq("user_id", userId),
        supabase.from("practical_experiences").select("*").eq("user_id", userId),
        supabase.from("certifications").select("*").eq("user_id", userId),
        supabase.from("publications").select("*").eq("user_id", userId),
        supabase.from("custom_sections").select("*").eq("user_id", userId),
        supabase.from("custom_section_entries").select("*").eq("user_id", userId),
        supabase.from("user_documents").select("*").eq("user_id", userId),
        supabase.from("document_versions").select("*").eq("user_id", userId),
        supabase.from("applications").select("*").eq("user_id", userId),
        supabase.from("user_notification_preferences").select("*").eq("user_id", userId).single(),
        supabase.from("user_email_aliases").select("*").eq("user_id", userId),
      ]);

      // Compile all data
      const exportData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportVersion: "1.0",
          exportedBy: "admin",
          userId: userId,
          userEmail: userData.email,
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
        emailAliases: emailAliases || [],
      };

      // Create downloadable JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-export-${userData.email}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log admin action
      await supabase.rpc("log_admin_action", {
        p_action: "export_user_data",
        p_target_user_id: userId,
        p_target_table: "profiles",
        p_target_record_id: userId,
        p_query_details: { export_format: "json" },
      });

      toast({
        title: "Datenexport erfolgreich",
        description: "Die Benutzerdaten wurden als JSON-Datei heruntergeladen.",
      });
    } catch (error) {
      console.error("Error exporting user data:", error);
      toast({
        title: "Fehler beim Datenexport",
        description: "Beim Exportieren der Benutzerdaten ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benutzerdaten exportieren</CardTitle>
        <CardDescription>
          Exportieren Sie alle personenbezogenen Daten eines Benutzers für DSGVO-Auskunftsanfragen (Art. 15)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="email">Benutzer-E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="benutzer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} disabled={isSearching || !email}>
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Suchen
            </Button>
          </div>
        </div>

        {userData && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">
                  {userData.vorname} {userData.nachname}
                </p>
                <p className="text-sm text-muted-foreground">{userData.email}</p>
                <p className="text-sm text-muted-foreground">User ID: {userData.user_id}</p>
                {userData.role && (
                  <p className="text-sm text-muted-foreground">Rolle: {userData.role}</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleExport}
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
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Der Export enthält:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Profildaten, Berufserfahrung, Ausbildung, Praktika</li>
            <li>Zertifikate, Publikationen, Fähigkeiten</li>
            <li>Generierte Dokumente (CV- und Anschreiben-Versionen)</li>
            <li>Bewerbungen und Kommunikationsverlauf</li>
            <li>E-Mail-Präferenzen und Aliase</li>
          </ul>
          <p className="mt-3 text-xs">
            <strong>Hinweis:</strong> Diese Aktion wird im Audit-Log protokolliert.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
