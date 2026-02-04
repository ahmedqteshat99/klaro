import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminUserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [docCounts, setDocCounts] = useState({ cv: 0, anschreiben: 0 });

  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      setIsLoading(true);

      const [profileRes, docsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("document_versions").select("typ").eq("user_id", id),
      ]);

      if (profileRes.error) {
        toast({
          title: "Fehler",
          description: profileRes.error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (docsRes.error) {
        toast({
          title: "Fehler",
          description: docsRes.error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setProfile(profileRes.data ?? null);

      const counts = { cv: 0, anschreiben: 0 };
      (docsRes.data ?? []).forEach((doc) => {
        if (doc.typ === "CV") counts.cv += 1;
        if (doc.typ === "Anschreiben") counts.anschreiben += 1;
      });
      setDocCounts(counts);
      setIsLoading(false);
    };

    void loadUser();
  }, [id, toast]);

  const handleDeleteUser = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: id },
      });

      if (error || data?.success === false) {
        throw new Error(error?.message || data?.error || "Löschen fehlgeschlagen");
      }

      toast({
        title: "Benutzer gelöscht",
        description: "Alle zugehörigen Daten wurden entfernt.",
      });
      navigate("/admin/users");
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err?.message || "Löschen fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fullName = useMemo(() => {
    if (!profile) return "-";
    return `${profile.vorname ?? ""} ${profile.nachname ?? ""}`.trim() || "-";
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Benutzer nicht gefunden</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/admin/users")}>Zurück</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Benutzerprofil</h1>
        <p className="text-sm text-muted-foreground">Details und Aktivität</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basisdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{fullName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">E-Mail</span><span className="font-medium">{profile.email ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Rolle</span><span className="font-medium">{profile.role ?? "USER"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Erstellt</span><span className="font-medium">{formatDateTime(profile.created_at)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Letzter Zugriff</span><span className="font-medium">{formatDateTime(profile.last_seen_at)}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profilfelder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Telefon</span><span className="font-medium">{profile.telefon ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Stadt</span><span className="font-medium">{profile.stadt ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fachrichtung</span><span className="font-medium">{profile.fachrichtung ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Deutschniveau</span><span className="font-medium">{profile.deutschniveau ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Approbationsstatus</span><span className="font-medium">{profile.approbationsstatus ?? "-"}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Lebensläufe</span><span className="font-medium">{docCounts.cv}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Anschreiben</span><span className="font-medium">{docCounts.anschreiben}</span></div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Benutzer löschen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Benutzer löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dieser Vorgang entfernt das Benutzerkonto und alle zugehörigen Daten dauerhaft.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
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
  );
};

export default AdminUserDetailPage;
