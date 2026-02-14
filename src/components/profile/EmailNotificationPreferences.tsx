import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NotificationPreferences {
  onboarding_nudges_enabled: boolean;
  reactivation_emails_enabled: boolean;
  job_alerts_enabled: boolean;
}

export default function EmailNotificationPreferences() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    onboarding_nudges_enabled: false,
    reactivation_emails_enabled: false,
    job_alerts_enabled: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("onboarding_nudges_enabled, reactivation_emails_enabled, job_alerts_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          onboarding_nudges_enabled: data.onboarding_nudges_enabled ?? false,
          reactivation_emails_enabled: data.reactivation_emails_enabled ?? false,
          job_alerts_enabled: data.job_alerts_enabled ?? false,
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      toast({
        title: "Fehler",
        description: "Benachrichtigungseinstellungen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            [key]: value,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setPreferences((prev) => ({ ...prev, [key]: value }));

      toast({
        title: "Gespeichert",
        description: "Ihre Benachrichtigungseinstellungen wurden aktualisiert.",
      });
    } catch (error) {
      console.error("Error updating preference:", error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card id="benachrichtigungen">
        <CardHeader>
          <CardTitle>E-Mail Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="benachrichtigungen">
      <CardHeader>
        <CardTitle>E-Mail Benachrichtigungen</CardTitle>
        <CardDescription>
          Wählen Sie, welche E-Mails Sie von uns erhalten möchten. Sie können diese
          Einstellungen jederzeit ändern.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="onboarding-nudges" className="text-base font-medium">
              Erinnerungen zur Profil-Vervollständigung
            </Label>
            <p className="text-sm text-muted-foreground">
              Hilfreiche Tipps, wenn Ihr Profil noch nicht vollständig ist
            </p>
          </div>
          <Switch
            id="onboarding-nudges"
            checked={preferences.onboarding_nudges_enabled}
            onCheckedChange={(checked) =>
              updatePreference("onboarding_nudges_enabled", checked)
            }
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="reactivation" className="text-base font-medium">
              Reaktivierungs-Benachrichtigungen
            </Label>
            <p className="text-sm text-muted-foreground">
              Erinnerung, wenn Sie längere Zeit nicht aktiv waren
            </p>
          </div>
          <Switch
            id="reactivation"
            checked={preferences.reactivation_emails_enabled}
            onCheckedChange={(checked) =>
              updatePreference("reactivation_emails_enabled", checked)
            }
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="job-alerts" className="text-base font-medium">
              Tägliche Job-Benachrichtigungen
            </Label>
            <p className="text-sm text-muted-foreground">
              Erhalten Sie täglich eine Übersicht neuer Stellenangebote
            </p>
          </div>
          <Switch
            id="job-alerts"
            checked={preferences.job_alerts_enabled}
            onCheckedChange={(checked) =>
              updatePreference("job_alerts_enabled", checked)
            }
            disabled={saving}
          />
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Sie können diese Benachrichtigungen jederzeit über den Abmelde-Link in jeder
            E-Mail deaktivieren.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
