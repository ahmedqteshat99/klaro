import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Search, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AccountDeletionManager() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [hasReadWarning, setHasReadWarning] = useState(false);

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
        p_query_details: { searched_email: email, intent: "deletion_check" },
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

  const handleDelete = async () => {
    if (!userData) return;
    if (confirmText !== "LÖSCHEN") {
      toast({
        title: "Bestätigung erforderlich",
        description: 'Bitte geben Sie "LÖSCHEN" ein, um fortzufahren.',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const userId = userData.user_id;

      // Call the database function to delete all user data
      const { data, error } = await supabase.rpc("delete_user_account", {
        p_user_id: userId,
      });

      if (error) throw error;

      // Log admin action
      await supabase.rpc("log_admin_action", {
        p_action: "delete_account",
        p_target_user_id: userId,
        p_target_table: "profiles",
        p_target_record_id: userId,
        p_query_details: {
          deleted_email: userData.email,
          deleted_name: `${userData.vorname} ${userData.nachname}`,
          deletion_summary: data,
        },
      });

      toast({
        title: "Konto erfolgreich gelöscht",
        description: `Das Konto von ${userData.vorname} ${userData.nachname} wurde vollständig gelöscht.`,
      });

      // Reset state
      setUserData(null);
      setEmail("");
      setConfirmText("");
      setHasReadWarning(false);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Fehler beim Löschen",
        description: error instanceof Error ? error.message : "Beim Löschen des Kontos ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = hasReadWarning && confirmText === "LÖSCHEN";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Kontolöschung (DSGVO Art. 17)
          </CardTitle>
          <CardDescription>
            Vollständige Löschung aller personenbezogenen Daten eines Benutzers auf Anfrage (Recht auf Vergessenwerden)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-destructive">WARNUNG: Irreversibler Vorgang!</p>
                <p className="text-muted-foreground">
                  Die Kontolöschung entfernt ALLE Daten des Benutzers permanent und unwiderruflich:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Profildaten, Berufserfahrung, Ausbildung</li>
                  <li>Alle generierten Dokumente (CVs und Anschreiben)</li>
                  <li>Bewerbungen und Kommunikationsverlauf</li>
                  <li>E-Mail-Einstellungen und Aliase</li>
                  <li>Authentifizierungsdaten und Sessions</li>
                </ul>
                <p className="font-medium text-destructive mt-3">
                  Dieser Vorgang kann NICHT rückgängig gemacht werden!
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="delete-email">Benutzer-E-Mail</Label>
              <Input
                id="delete-email"
                type="email"
                placeholder="benutzer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={isSearching || !email} variant="outline">
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
            <div className="rounded-lg border p-4 space-y-4">
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
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Konto permanent löschen
              </Button>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">DSGVO-Hinweise:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Löschanfragen müssen innerhalb von 30 Tagen bearbeitet werden (Art. 17 Abs. 1)</li>
              <li>Die Löschung wird im Audit-Log protokolliert (Rechenschaftspflicht)</li>
              <li>Ausnahmen: Gesetzliche Aufbewahrungspflichten können gelten</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Konto permanent löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Sie sind im Begriff, das Konto von{" "}
                <strong>{userData?.vorname} {userData?.nachname}</strong>{" "}
                ({userData?.email}) vollständig zu löschen.
              </p>
              <p className="text-destructive font-medium">
                Diese Aktion ist IRREVERSIBEL und löscht ALLE Benutzerdaten permanent!
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirm-read"
                    checked={hasReadWarning}
                    onCheckedChange={(checked) => setHasReadWarning(checked === true)}
                  />
                  <Label htmlFor="confirm-read" className="text-sm cursor-pointer">
                    Ich habe die Warnung gelesen und verstehe, dass dieser Vorgang nicht
                    rückgängig gemacht werden kann.
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-text">
                    Geben Sie "LÖSCHEN" ein, um zu bestätigen:
                  </Label>
                  <Input
                    id="confirm-text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="LÖSCHEN"
                    disabled={!hasReadWarning}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmText("");
              setHasReadWarning(false);
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!canDelete || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lösche...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Konto löschen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
