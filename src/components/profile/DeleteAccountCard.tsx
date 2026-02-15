import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteAccount } from "@/lib/api/generation";
import { supabase } from "@/integrations/supabase/client";

export default function DeleteAccountCard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDeleteAccount = async () => {
    if (confirmText !== "LÖSCHEN") return;

    setIsDeleting(true);
    try {
      const result = await deleteAccount();

      if (result.success) {
        await supabase.auth.signOut();
        toast({
          title: "Konto gelöscht",
          description: "Ihr Konto und alle zugehörigen Daten wurden unwiderruflich gelöscht.",
        });
        navigate("/");
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Konto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Konto löschen
          </CardTitle>
          <CardDescription>
            Löschen Sie Ihr Konto und alle damit verbundenen Daten unwiderruflich.
            Dies umfasst Ihr Profil, alle Dokumente, Berufserfahrungen, Ausbildungen und gespeicherte Dateien.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setIsDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Konto endgültig löschen
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Konto unwiderruflich löschen
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. Folgende Daten werden gelöscht:
              </span>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Ihr gesamtes Profil</li>
                <li>Alle Berufserfahrungen und Ausbildungen</li>
                <li>Alle generierten Dokumente (CV, Anschreiben)</li>
                <li>Alle hochgeladenen Dateien (Foto, Unterschrift)</li>
                <li>Ihr Benutzerkonto und Zugangsdaten</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete" className="text-sm">
              Bitte geben Sie <strong>LÖSCHEN</strong> ein, um zu bestätigen:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              disabled={isDeleting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setConfirmText("");
              }}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmText !== "LÖSCHEN" || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Konto endgültig löschen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
