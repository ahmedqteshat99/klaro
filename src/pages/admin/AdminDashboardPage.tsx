import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Metrics {
  totalUsers: number;
  signups24h: number;
  signups7d: number;
  generationsTotal: number;
  generations24h: number;
  generations7d: number;
  exports24h: number;
  exports7d: number;
  active15m: number;
  active60m: number;
  eventsByDay: { date: string; count: number }[];
}

const formatCount = (value: number) => value.toLocaleString("de-DE");

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since15m = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const since60m = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const since14d = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const [
        totalUsersRes,
        signups24hRes,
        signups7dRes,
        generationsTotalRes,
        generations24hRes,
        generations7dRes,
        exports24hRes,
        exports7dRes,
        active15mRes,
        active60mRes,
        eventsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since24h),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since7d),
        supabase
          .from("app_events")
          .select("id", { count: "exact", head: true })
          .eq("type", "generate"),
        supabase
          .from("app_events")
          .select("id", { count: "exact", head: true })
          .eq("type", "generate")
          .gte("created_at", since24h),
        supabase
          .from("app_events")
          .select("id", { count: "exact", head: true })
          .eq("type", "generate")
          .gte("created_at", since7d),
        supabase
          .from("app_events")
          .select("id", { count: "exact", head: true })
          .eq("type", "export")
          .gte("created_at", since24h),
        supabase
          .from("app_events")
          .select("id", { count: "exact", head: true })
          .eq("type", "export")
          .gte("created_at", since7d),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", since15m),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", since60m),
        supabase
          .from("app_events")
          .select("created_at")
          .gte("created_at", since14d)
          .order("created_at", { ascending: true }),
      ]);

      const errors = [
        totalUsersRes.error,
        signups24hRes.error,
        signups7dRes.error,
        generationsTotalRes.error,
        generations24hRes.error,
        generations7dRes.error,
        exports24hRes.error,
        exports7dRes.error,
        active15mRes.error,
        active60mRes.error,
        eventsRes.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(errors[0]?.message || "Fehler beim Laden der Metriken");
      }

      const dayKeys = Array.from({ length: 14 }, (_, index) => {
        const date = new Date(now.getTime() - (13 - index) * 24 * 60 * 60 * 1000);
        return date.toISOString().slice(0, 10);
      });

      const dayCountMap = new Map<string, number>();
      (eventsRes.data ?? []).forEach((event) => {
        const key = event.created_at.slice(0, 10);
        dayCountMap.set(key, (dayCountMap.get(key) ?? 0) + 1);
      });

      const eventsByDay = dayKeys.map((key) => ({
        date: key,
        count: dayCountMap.get(key) ?? 0,
      }));

      setMetrics({
        totalUsers: totalUsersRes.count ?? 0,
        signups24h: signups24hRes.count ?? 0,
        signups7d: signups7dRes.count ?? 0,
        generationsTotal: generationsTotalRes.count ?? 0,
        generations24h: generations24hRes.count ?? 0,
        generations7d: generations7dRes.count ?? 0,
        exports24h: exports24hRes.count ?? 0,
        exports7d: exports7dRes.count ?? 0,
        active15m: active15mRes.count ?? 0,
        active60m: active60mRes.count ?? 0,
        eventsByDay,
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || "Fehler beim Laden der Metriken");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
    const interval = setInterval(() => {
      void loadMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadMetrics]);

  const formattedEventsByDay = useMemo(() => {
    if (!metrics) return [];
    return metrics.eventsByDay.map((entry) => ({
      ...entry,
      label: new Date(entry.date).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      }),
    }));
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fehler</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error || "Metriken konnten nicht geladen werden."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live-Überblick über Nutzung und Aktivität.
        </p>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            Letzte Aktualisierung: {lastUpdated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gesamte Nutzer</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.totalUsers)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Neuregistrierungen (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.signups24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Neuregistrierungen (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.signups7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generierungen gesamt</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.generationsTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generierungen (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.generations24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generierungen (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.generations7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Exporte (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.exports24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Exporte (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.exports7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aktiv (15 Min.)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.active15m)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aktiv (60 Min.)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.active60m)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events der letzten 14 Tage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {formattedEventsByDay.map((entry) => (
              <div
                key={entry.date}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="font-medium">{formatCount(entry.count)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
