import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LANDING_HERO_CTA_EXPERIMENT_ID } from "@/lib/experiments";
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
  applicationsSent24h: number;
  applicationsSent7d: number;
  inboundReplies7d: number;
  signupToSent7dPercent: number;
  lifecycleQueued24h: number;
  lifecycleSent24h: number;
  lifecycleFailed24h: number;
  lifecycleSent7d: number;
  lifecycleFailed7d: number;
  lifecycleSuccessRate7d: number;
  lifecycleByCampaign7d: Array<{
    campaign: string;
    total: number;
    queued: number;
    sent: number;
    failed: number;
    successRate: number;
  }>;
  lifecycleRecentFailures: Array<{
    campaign: string;
    recipientEmail: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
  topSignupSources7d: { source: string; count: number }[];
  topSignupCtaSources7d: { source: string; count: number }[];
  landingVariantPerformance7d: Array<{
    variant: string;
    signups: number;
    sends: number;
    conversionPercent: number;
  }>;
  eventsByDay: { date: string; count: number }[];
}

const formatCount = (value: number) => value.toLocaleString("de-DE");
const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatCampaignLabel = (value: string) => {
  if (value === "onboarding_nudge") return "Onboarding Nudge";
  if (value === "reactivation") return "Reactivation";
  if (value === "daily_job_alert") return "Daily Job Alert";
  return value;
};

const extractSignupSource = (meta: unknown): string => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "direct";
  const record = meta as Record<string, unknown>;
  const firstTouch = record.attribution_first_touch;
  if (firstTouch && typeof firstTouch === "object" && !Array.isArray(firstTouch)) {
    const source = (firstTouch as Record<string, unknown>).source;
    if (typeof source === "string" && source.trim().length > 0) return source.trim();
  }
  return "direct";
};

const extractExperimentVariant = (meta: unknown, experimentId: string): string => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "unknown";
  const record = meta as Record<string, unknown>;
  const experiments = record.attribution_experiments;
  if (!experiments || typeof experiments !== "object" || Array.isArray(experiments)) return "unknown";
  const variant = (experiments as Record<string, unknown>)[experimentId];
  return typeof variant === "string" && variant.trim().length > 0 ? variant.trim() : "unknown";
};

const extractPendingCtaSource = (meta: unknown): string => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "unknown";
  const record = meta as Record<string, unknown>;
  const pendingCta = record.attribution_pending_cta;
  if (!pendingCta || typeof pendingCta !== "object" || Array.isArray(pendingCta)) return "unknown";
  const source = (pendingCta as Record<string, unknown>).source;
  return typeof source === "string" && source.trim().length > 0 ? source.trim() : "unknown";
};

const isMissingLifecycleTableError = (error: unknown) => {
  if (!error || typeof error !== "object" || Array.isArray(error)) return false;
  const record = error as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";
  return (
    message.includes("public.lifecycle_email_logs") &&
    message.toLowerCase().includes("schema cache")
  );
};

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
        applicationsSent24hRes,
        applicationsSent7dRes,
        inboundReplies7dRes,
        lifecycleQueued24hRes,
        lifecycleSent24hRes,
        lifecycleFailed24hRes,
        lifecycleSent7dRes,
        lifecycleFailed7dRes,
        lifecycleCampaignRows7dRes,
        lifecycleRecentFailuresRes,
        signupEvents7dRes,
        funnelSendEvents7dRes,
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
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("status", ["sent", "replied"])
          .gte("submitted_at", since24h),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("status", ["sent", "replied"])
          .gte("submitted_at", since7d),
        supabase
          .from("application_messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "inbound")
          .gte("created_at", since7d),
        supabase
          .from("lifecycle_email_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "queued")
          .gte("created_at", since24h),
        supabase
          .from("lifecycle_email_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("created_at", since24h),
        supabase
          .from("lifecycle_email_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", since24h),
        supabase
          .from("lifecycle_email_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("created_at", since7d),
        supabase
          .from("lifecycle_email_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", since7d),
        supabase
          .from("lifecycle_email_logs")
          .select("campaign_type,status,created_at")
          .gte("created_at", since7d)
          .limit(20000),
        supabase
          .from("lifecycle_email_logs")
          .select("campaign_type,recipient_email,error_message,created_at")
          .eq("status", "failed")
          .gte("created_at", since7d)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("app_events")
          .select("meta")
          .eq("type", "signup")
          .gte("created_at", since7d)
          .limit(5000),
        supabase
          .from("app_events")
          .select("meta")
          .eq("type", "funnel_send_success")
          .gte("created_at", since7d)
          .limit(5000),
        supabase
          .from("app_events")
          .select("created_at")
          .gte("created_at", since14d)
          .order("created_at", { ascending: true }),
      ]);

      const coreErrors = [
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
        applicationsSent24hRes.error,
        applicationsSent7dRes.error,
        inboundReplies7dRes.error,
        signupEvents7dRes.error,
        funnelSendEvents7dRes.error,
        eventsRes.error,
      ].filter(Boolean);

      const lifecycleErrors = [
        lifecycleQueued24hRes.error,
        lifecycleSent24hRes.error,
        lifecycleFailed24hRes.error,
        lifecycleSent7dRes.error,
        lifecycleFailed7dRes.error,
        lifecycleCampaignRows7dRes.error,
        lifecycleRecentFailuresRes.error,
      ]
        .filter(Boolean)
        .filter((error) => !isMissingLifecycleTableError(error));

      const errors = [...coreErrors, ...lifecycleErrors];

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

      const signups7d = signups7dRes.count ?? 0;
      const applicationsSent7d = applicationsSent7dRes.count ?? 0;
      const signupToSent7dPercent = signups7d > 0 ? (applicationsSent7d / signups7d) * 100 : 0;
      const lifecycleSent7d = lifecycleSent7dRes.count ?? 0;
      const lifecycleFailed7d = lifecycleFailed7dRes.count ?? 0;
      const lifecycleTotalAttempted7d = lifecycleSent7d + lifecycleFailed7d;
      const lifecycleSuccessRate7d =
        lifecycleTotalAttempted7d > 0
          ? (lifecycleSent7d / lifecycleTotalAttempted7d) * 100
          : 0;

      const lifecycleCampaignMap = new Map<
        string,
        { queued: number; sent: number; failed: number }
      >();
      (lifecycleCampaignRows7dRes.data ?? []).forEach((row) => {
        const campaign = row.campaign_type || "unknown";
        const bucket = lifecycleCampaignMap.get(campaign) ?? {
          queued: 0,
          sent: 0,
          failed: 0,
        };
        if (row.status === "queued") bucket.queued += 1;
        if (row.status === "sent") bucket.sent += 1;
        if (row.status === "failed") bucket.failed += 1;
        lifecycleCampaignMap.set(campaign, bucket);
      });
      const lifecycleByCampaign7d = Array.from(lifecycleCampaignMap.entries())
        .map(([campaign, stats]) => {
          const total = stats.queued + stats.sent + stats.failed;
          const attempted = stats.sent + stats.failed;
          return {
            campaign,
            total,
            queued: stats.queued,
            sent: stats.sent,
            failed: stats.failed,
            successRate: attempted > 0 ? (stats.sent / attempted) * 100 : 0,
          };
        })
        .sort((a, b) => b.total - a.total);

      const lifecycleRecentFailures =
        lifecycleRecentFailuresRes.data?.map((row) => ({
          campaign: row.campaign_type,
          recipientEmail: row.recipient_email,
          errorMessage: row.error_message,
          createdAt: row.created_at,
        })) ?? [];

      const sourceMap = new Map<string, number>();
      const ctaSourceMap = new Map<string, number>();
      const signupsByVariant = new Map<string, number>();
      (signupEvents7dRes.data ?? []).forEach((row) => {
        const source = extractSignupSource(row.meta);
        sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);

        const ctaSource = extractPendingCtaSource(row.meta);
        ctaSourceMap.set(ctaSource, (ctaSourceMap.get(ctaSource) ?? 0) + 1);

        const variant = extractExperimentVariant(row.meta, LANDING_HERO_CTA_EXPERIMENT_ID);
        signupsByVariant.set(variant, (signupsByVariant.get(variant) ?? 0) + 1);
      });
      const topSignupSources7d = Array.from(sourceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([source, count]) => ({ source, count }));
      const topSignupCtaSources7d = Array.from(ctaSourceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([source, count]) => ({ source, count }));

      const sendsByVariant = new Map<string, number>();
      (funnelSendEvents7dRes.data ?? []).forEach((row) => {
        const variant = extractExperimentVariant(row.meta, LANDING_HERO_CTA_EXPERIMENT_ID);
        sendsByVariant.set(variant, (sendsByVariant.get(variant) ?? 0) + 1);
      });
      const variants = Array.from(
        new Set([...signupsByVariant.keys(), ...sendsByVariant.keys()])
      );
      const landingVariantPerformance7d = variants
        .map((variant) => {
          const variantSignups = signupsByVariant.get(variant) ?? 0;
          const variantSends = sendsByVariant.get(variant) ?? 0;
          const conversionPercent =
            variantSignups > 0 ? (variantSends / variantSignups) * 100 : 0;
          return {
            variant,
            signups: variantSignups,
            sends: variantSends,
            conversionPercent,
          };
        })
        .sort((a, b) => b.signups - a.signups);

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
        applicationsSent24h: applicationsSent24hRes.count ?? 0,
        applicationsSent7d: applicationsSent7d,
        inboundReplies7d: inboundReplies7dRes.count ?? 0,
        signupToSent7dPercent,
        lifecycleQueued24h: lifecycleQueued24hRes.count ?? 0,
        lifecycleSent24h: lifecycleSent24hRes.count ?? 0,
        lifecycleFailed24h: lifecycleFailed24hRes.count ?? 0,
        lifecycleSent7d,
        lifecycleFailed7d,
        lifecycleSuccessRate7d,
        lifecycleByCampaign7d,
        lifecycleRecentFailures,
        topSignupSources7d,
        topSignupCtaSources7d,
        landingVariantPerformance7d,
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Versendete Bewerbungen (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.applicationsSent24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Versendete Bewerbungen (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.applicationsSent7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Eingehende Antworten (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.inboundReplies7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Signup → Versand (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent(metrics.signupToSent7dPercent)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle E-Mails (24h) gesendet</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.lifecycleSent24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle E-Mails (24h) fehlgeschlagen</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.lifecycleFailed24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle Queue (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.lifecycleQueued24h)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle E-Mails (7 Tage) gesendet</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.lifecycleSent7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle E-Mails (7 Tage) fehlgeschlagen</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCount(metrics.lifecycleFailed7d)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lifecycle Zustellrate (7 Tage)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent(metrics.lifecycleSuccessRate7d)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle Performance je Kampagne (7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.lifecycleByCampaign7d.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Lifecycle-Daten.</p>
          ) : (
            <div className="grid gap-2">
              {metrics.lifecycleByCampaign7d.map((item) => (
                <div
                  key={item.campaign}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{formatCampaignLabel(item.campaign)}</span>
                  <span className="font-medium">Total: {formatCount(item.total)}</span>
                  <span className="font-medium">Sent: {formatCount(item.sent)}</span>
                  <span className="font-medium">Failed: {formatCount(item.failed)}</span>
                  <span className="font-medium">{formatPercent(item.successRate)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle Fehler (letzte 7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.lifecycleRecentFailures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Fehler in den letzten 7 Tagen.</p>
          ) : (
            <div className="grid gap-2">
              {metrics.lifecycleRecentFailures.map((item) => (
                <div
                  key={`${item.createdAt}-${item.recipientEmail}`}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{formatCampaignLabel(item.campaign)}</p>
                  <p className="text-muted-foreground">{item.recipientEmail}</p>
                  <p className="text-muted-foreground">
                    {item.errorMessage || "Unbekannter Fehler"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleString("de-DE")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Signup-Quellen (7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topSignupSources7d.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine erfassten Quellen.</p>
          ) : (
            <div className="grid gap-2">
              {metrics.topSignupSources7d.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{item.source}</span>
                  <span className="font-medium">{formatCount(item.count)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top CTA-Quellen vor Signup (7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topSignupCtaSources7d.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine CTA-Daten.</p>
          ) : (
            <div className="grid gap-2">
              {metrics.topSignupCtaSources7d.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{item.source}</span>
                  <span className="font-medium">{formatCount(item.count)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Landing A/B Conversion (7 Tage)</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.landingVariantPerformance7d.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Variantendaten.</p>
          ) : (
            <div className="grid gap-2">
              {metrics.landingVariantPerformance7d.map((item) => (
                <div
                  key={item.variant}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{item.variant}</span>
                  <span className="font-medium">Signups: {formatCount(item.signups)}</span>
                  <span className="font-medium">Sends: {formatCount(item.sends)}</span>
                  <span className="font-medium">{formatPercent(item.conversionPercent)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
