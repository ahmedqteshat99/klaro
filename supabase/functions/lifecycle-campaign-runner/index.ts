import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CampaignName = "onboarding_nudge" | "reactivation" | "daily_job_alert";

interface ProfileRow {
  user_id: string;
  email: string | null;
  vorname: string | null;
  nachname: string | null;
  onboarding_completed: boolean | null;
  last_seen_at: string | null;
  created_at: string | null;
}

interface PreferenceRow {
  user_id: string;
  onboarding_nudges_enabled: boolean | null;
  reactivation_emails_enabled: boolean | null;
  job_alerts_enabled: boolean | null;
  last_onboarding_nudge_at: string | null;
  last_reactivation_email_at: string | null;
  last_job_alert_at: string | null;
}

interface JobRow {
  id: string;
  title: string | null;
  hospital_name: string | null;
  location: string | null;
  published_at: string | null;
}

interface CampaignSummary {
  campaign: CampaignName;
  candidates: number;
  processed: number;
  would_send: number;
  sent: number;
  failed: number;
  skipped: number;
}

const ALL_CAMPAIGNS: CampaignName[] = [
  "onboarding_nudge",
  "reactivation",
  "daily_job_alert",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isEmail = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 3 && value.includes("@");

const daysToMs = (days: number) => days * 24 * 60 * 60 * 1000;

const dayKey = (value: Date = new Date()) => value.toISOString().slice(0, 10);

const isoOlderThanDays = (
  isoValue: string | null | undefined,
  days: number,
  options?: { treatMissingAsOld?: boolean }
) => {
  if (!isoValue) return options?.treatMissingAsOld ?? false;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now() - daysToMs(days);
};

const isoToDay = (isoValue: string | null | undefined): string | null => {
  if (!isoValue) return null;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
};

const parseLimit = (value: unknown, fallback = 200) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(1000, Math.trunc(n)));
};

const parseCampaignList = (value: unknown): CampaignName[] => {
  if (!value) return ALL_CAMPAIGNS;
  let tokens: string[] = [];
  if (Array.isArray(value)) {
    tokens = value.map((item) => String(item).trim().toLowerCase());
  } else {
    tokens = String(value)
      .split(",")
      .map((item) => item.trim().toLowerCase());
  }

  const filtered = tokens.filter((token): token is CampaignName =>
    ALL_CAMPAIGNS.includes(token as CampaignName)
  );
  return filtered.length > 0 ? Array.from(new Set(filtered)) : ALL_CAMPAIGNS;
};

const buildDisplayName = (profile: ProfileRow) =>
  [profile.vorname, profile.nachname].filter(Boolean).join(" ").trim() || "Sie";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const lineBreakHtml = (value: string) => escapeHtml(value).replaceAll("\n", "<br/>");

const buildMailgunForm = (params: {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  const form = new FormData();
  form.append("from", `${params.fromName} <${params.fromEmail}>`);
  form.append("to", params.to);
  form.append("subject", params.subject);
  form.append("text", params.text);
  if (params.html) form.append("html", params.html);
  return form;
};

const sendMailgunEmail = async (params: {
  apiBaseUrl: string;
  domain: string;
  apiKey: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  const form = buildMailgunForm(params);
  const auth = btoa(`api:${params.apiKey}`);
  const base = params.apiBaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${base}/v3/${params.domain}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun send failed: ${response.status} ${errorText}`);
  }

  return response.json();
};

const dedupeViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "23505";

// GDPR-compliant: Only send if explicitly enabled (opt-in, not opt-out)
const isEnabled = (value: boolean | null | undefined) => value === true;

const buildOnboardingNudge = (profile: ProfileRow, siteUrl: string) => {
  const name = buildDisplayName(profile);
  const onboardingUrl = `${siteUrl}/onboarding`;
  const jobsUrl = `${siteUrl}/jobs`;
  const unsubscribeUrl = `${siteUrl}/profil#benachrichtigungen`;
  const subject = "Ihr Klaro Profil ist fast fertig";
  const text =
    `Hallo ${name},\n\n` +
    "Sie haben bereits gestartet. Mit dem letzten Schritt koennen Sie direkt Bewerbungen vorbereiten und versenden.\n\n" +
    `Onboarding abschliessen: ${onboardingUrl}\n` +
    `Job Board ansehen: ${jobsUrl}\n\n` +
    "Viele Gruesse\nKlaro\n\n" +
    `---\n` +
    `Diese Erinnerungen abbestellen: ${unsubscribeUrl}`;
  const html =
    `<p>Hallo ${escapeHtml(name)},</p>` +
    "<p>Sie haben bereits gestartet. Mit dem letzten Schritt koennen Sie direkt Bewerbungen vorbereiten und versenden.</p>" +
    `<p><a href="${escapeHtml(onboardingUrl)}">Onboarding abschliessen</a><br/>` +
    `<a href="${escapeHtml(jobsUrl)}">Job Board ansehen</a></p>` +
    "<p>Viele Gruesse<br/>Klaro</p>" +
    `<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;"/>` +
    `<p style="font-size: 12px; color: #666;"><a href="${escapeHtml(unsubscribeUrl)}">Diese Erinnerungen abbestellen</a></p>`;
  return { subject, text, html };
};

const buildReactivationEmail = (profile: ProfileRow, siteUrl: string) => {
  const name = buildDisplayName(profile);
  const jobsUrl = `${siteUrl}/jobs`;
  const inboxUrl = `${siteUrl}/inbox`;
  const unsubscribeUrl = `${siteUrl}/profil#benachrichtigungen`;
  const subject = "Neue Chancen auf Klaro warten auf Sie";
  const text =
    `Hallo ${name},\n\n` +
    "Auf Klaro wurden neue Stellen veroeffentlicht. Ihr Profil und Ihre Unterlagen sind weiterhin bereit.\n\n" +
    `Job Board: ${jobsUrl}\n` +
    `Inbox: ${inboxUrl}\n\n` +
    "Viele Gruesse\nKlaro\n\n" +
    `---\n` +
    `Diese Benachrichtigungen abbestellen: ${unsubscribeUrl}`;
  const html =
    `<p>Hallo ${escapeHtml(name)},</p>` +
    "<p>Auf Klaro wurden neue Stellen veroeffentlicht. Ihr Profil und Ihre Unterlagen sind weiterhin bereit.</p>" +
    `<p><a href="${escapeHtml(jobsUrl)}">Job Board</a><br/>` +
    `<a href="${escapeHtml(inboxUrl)}">Inbox</a></p>` +
    "<p>Viele Gruesse<br/>Klaro</p>" +
    `<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;"/>` +
    `<p style="font-size: 12px; color: #666;"><a href="${escapeHtml(unsubscribeUrl)}">Diese Benachrichtigungen abbestellen</a></p>`;
  return { subject, text, html };
};

const buildDailyJobAlert = (profile: ProfileRow, jobs: JobRow[], siteUrl: string) => {
  const name = buildDisplayName(profile);
  const topJobs = jobs.slice(0, 8);
  const jobsUrl = `${siteUrl}/jobs`;
  const unsubscribeUrl = `${siteUrl}/profil#benachrichtigungen`;
  const subject = `Neue Assistenzarzt Jobs auf Klaro (${topJobs.length})`;

  const textLines = topJobs.map((job) => {
    const title = job.title?.trim() || "Assistenzarzt Stelle";
    const hospital = job.hospital_name?.trim();
    const location = job.location?.trim();
    const details = [hospital, location].filter(Boolean).join(" - ");
    return `- ${title}${details ? ` (${details})` : ""}\n  ${siteUrl}/jobs/${job.id}`;
  });

  const text =
    `Hallo ${name},\n\n` +
    "Heute wurden neue Stellen auf Klaro veroeffentlicht:\n\n" +
    `${textLines.join("\n")}\n\n` +
    `Alle Jobs: ${jobsUrl}\n\n` +
    "Viele Gruesse\nKlaro\n\n" +
    `---\n` +
    `Job-Benachrichtigungen abbestellen: ${unsubscribeUrl}`;

  const htmlItems = topJobs
    .map((job) => {
      const title = escapeHtml(job.title?.trim() || "Assistenzarzt Stelle");
      const hospital = job.hospital_name?.trim();
      const location = job.location?.trim();
      const details = [hospital, location].filter(Boolean).join(" - ");
      const jobUrl = `${siteUrl}/jobs/${job.id}`;
      return `<li><a href="${escapeHtml(jobUrl)}">${title}</a>${details ? ` <span>(${escapeHtml(details)})</span>` : ""}</li>`;
    })
    .join("");

  const html =
    `<p>Hallo ${escapeHtml(name)},</p>` +
    "<p>Heute wurden neue Stellen auf Klaro veroeffentlicht:</p>" +
    `<ul>${htmlItems}</ul>` +
    `<p><a href="${escapeHtml(jobsUrl)}">Alle Jobs ansehen</a></p>` +
    "<p>Viele Gruesse<br/>Klaro</p>" +
    `<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;"/>` +
    `<p style="font-size: 12px; color: #666;"><a href="${escapeHtml(unsubscribeUrl)}">Job-Benachrichtigungen abbestellen</a></p>`;

  return { subject, text, html };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
  const mailgunApiBaseUrl = Deno.env.get("MAILGUN_API_BASE_URL") ?? "https://api.eu.mailgun.net";
  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
  const fromEmail = Deno.env.get("MAILGUN_FROM_EMAIL") ?? "bewerbungen@klaro.tools";
  const fromName = Deno.env.get("MAILGUN_FROM_NAME") ?? "Klaro Bewerbungen";
  const lifecycleRunnerSecret = Deno.env.get("LIFECYCLE_RUNNER_SECRET") ?? "";
  const siteUrl = (
    Deno.env.get("PUBLIC_SITE_URL") ??
    Deno.env.get("VITE_PUBLIC_SITE_URL") ??
    "https://klaro.tools"
  ).replace(/\/+$/, "");

  if (!supabaseUrl || !serviceRoleKey || !mailgunApiKey || !mailgunDomain) {
    return jsonResponse({ error: "Server config missing" }, 500);
  }

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const providedSecret =
    req.headers.get("x-cron-secret")?.trim() ??
    url.searchParams.get("secret")?.trim() ??
    "";
  const authHeader = req.headers.get("Authorization")?.trim() ?? "";
  const serviceRoleAuth = authHeader === `Bearer ${serviceRoleKey}`;
  const secretAuth = lifecycleRunnerSecret.length > 0 && providedSecret === lifecycleRunnerSecret;

  if (lifecycleRunnerSecret.length > 0) {
    if (!secretAuth && !serviceRoleAuth) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  } else if (!serviceRoleAuth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const requestedCampaigns = parseCampaignList(
    body.campaigns ?? url.searchParams.get("campaigns")
  );
  const dryRun =
    parseBoolean(body.dryRun ?? url.searchParams.get("dryRun")) ?? false;
  const limitPerCampaign = parseLimit(
    body.limitPerCampaign ?? url.searchParams.get("limit"),
    200
  );

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const nowIso = new Date().toISOString();
  const todayKey = dayKey();

  const [
    profilesRes,
    prefsRes,
    recentApplicationsRes,
    recentJobsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("user_id, email, vorname, nachname, onboarding_completed, last_seen_at, created_at")
      .not("email", "is", null)
      .limit(5000),
    supabaseAdmin
      .from("user_notification_preferences")
      .select(
        "user_id, onboarding_nudges_enabled, reactivation_emails_enabled, job_alerts_enabled, last_onboarding_nudge_at, last_reactivation_email_at, last_job_alert_at"
      )
      .limit(5000),
    supabaseAdmin
      .from("applications")
      .select("user_id")
      .in("status", ["sent", "replied"])
      .gte("updated_at", new Date(Date.now() - daysToMs(30)).toISOString())
      .limit(10000),
    supabaseAdmin
      .from("jobs")
      .select("id, title, hospital_name, location, published_at")
      .eq("is_published", true)
      .gte("published_at", new Date(Date.now() - daysToMs(1)).toISOString())
      .order("published_at", { ascending: false })
      .limit(20),
  ]);

  if (profilesRes.error) {
    return jsonResponse({ error: profilesRes.error.message }, 500);
  }
  if (prefsRes.error) {
    return jsonResponse({ error: prefsRes.error.message }, 500);
  }
  if (recentApplicationsRes.error) {
    return jsonResponse({ error: recentApplicationsRes.error.message }, 500);
  }
  if (recentJobsRes.error) {
    return jsonResponse({ error: recentJobsRes.error.message }, 500);
  }

  const profiles = (profilesRes.data ?? []).filter((profile) => isEmail(profile.email)) as ProfileRow[];
  const prefByUser = new Map(
    ((prefsRes.data ?? []) as PreferenceRow[]).map((pref) => [pref.user_id, pref])
  );
  const recentlyActiveUsers = new Set(
    (recentApplicationsRes.data ?? []).map((row) => row.user_id as string)
  );
  const recentJobs = (recentJobsRes.data ?? []) as JobRow[];

  const summaries: CampaignSummary[] = [];

  const updatePreferenceTimestamp = async (
    userId: string,
    field:
      | "last_onboarding_nudge_at"
      | "last_reactivation_email_at"
      | "last_job_alert_at"
  ) => {
    const { error } = await supabaseAdmin
      .from("user_notification_preferences")
      .upsert(
        {
          user_id: userId,
          [field]: nowIso,
        },
        { onConflict: "user_id" }
      );
    if (error) {
      console.warn("Failed to update preference timestamp", userId, error.message);
    }
  };

  const sendWithLog = async (params: {
    campaign: CampaignName;
    userId: string;
    recipientEmail: string;
    dedupeKey: string;
    subject: string;
    text: string;
    html?: string;
    meta?: Record<string, unknown>;
  }): Promise<"sent" | "failed" | "skipped" | "would_send"> => {
    if (dryRun) {
      return "would_send";
    }

    const { data: queuedRow, error: queueError } = await supabaseAdmin
      .from("lifecycle_email_logs")
      .insert({
        user_id: params.userId,
        campaign_type: params.campaign,
        dedupe_key: params.dedupeKey,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        status: "queued",
        meta: params.meta ?? null,
      })
      .select("id")
      .maybeSingle();

    if (queueError) {
      if (dedupeViolation(queueError)) {
        return "skipped";
      }
      console.error("Failed to queue lifecycle log", queueError);
      return "failed";
    }

    const logId = queuedRow?.id as string | undefined;

    try {
      const mailgunResponse = await sendMailgunEmail({
        apiBaseUrl: mailgunApiBaseUrl,
        domain: mailgunDomain,
        apiKey: mailgunApiKey,
        fromName,
        fromEmail,
        to: params.recipientEmail,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });

      if (logId) {
        await supabaseAdmin
          .from("lifecycle_email_logs")
          .update({
            status: "sent",
            provider_message_id: mailgunResponse?.id ?? null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }

      return "sent";
    } catch (error) {
      console.error("Lifecycle send failed", params.campaign, params.userId, error);
      if (logId) {
        await supabaseAdmin
          .from("lifecycle_email_logs")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : String(error),
            sent_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }
      return "failed";
    }
  };

  const runCampaign = async (
    campaign: CampaignName,
    candidates: ProfileRow[],
    buildEmail: (
      profile: ProfileRow
    ) => { subject: string; text: string; html?: string; meta?: Record<string, unknown> },
    dedupeKey: string,
    preferenceTimestampField:
      | "last_onboarding_nudge_at"
      | "last_reactivation_email_at"
      | "last_job_alert_at"
  ) => {
    const limited = candidates.slice(0, limitPerCampaign);
    const summary: CampaignSummary = {
      campaign,
      candidates: candidates.length,
      processed: limited.length,
      would_send: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const profile of limited) {
      const recipientEmail = String(profile.email).trim();
      const emailPayload = buildEmail(profile);
      const outcome = await sendWithLog({
        campaign,
        userId: profile.user_id,
        recipientEmail,
        dedupeKey,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html,
        meta: emailPayload.meta,
      });

      if (outcome === "would_send") {
        summary.would_send += 1;
      } else if (outcome === "sent") {
        summary.sent += 1;
        await updatePreferenceTimestamp(profile.user_id, preferenceTimestampField);
      } else if (outcome === "failed") {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }
    }

    summaries.push(summary);
  };

  const includesCampaign = (campaign: CampaignName) =>
    requestedCampaigns.includes(campaign);

  if (includesCampaign("onboarding_nudge")) {
    const onboardingCandidates = profiles.filter((profile) => {
      const prefs = prefByUser.get(profile.user_id);
      return (
        !profile.onboarding_completed &&
        isEnabled(prefs?.onboarding_nudges_enabled) &&
        isoOlderThanDays(profile.created_at, 1) &&
        isoOlderThanDays(prefs?.last_onboarding_nudge_at, 3, { treatMissingAsOld: true })
      );
    });

    await runCampaign(
      "onboarding_nudge",
      onboardingCandidates,
      (profile) => {
        const email = buildOnboardingNudge(profile, siteUrl);
        return {
          ...email,
          meta: {
            campaign_context: "first_profile_completion",
            onboarding_completed: profile.onboarding_completed ?? false,
            profile_created_at: profile.created_at,
          },
        };
      },
      `onboarding_nudge:${todayKey}`,
      "last_onboarding_nudge_at"
    );
  }

  if (includesCampaign("reactivation")) {
    const reactivationCandidates = profiles.filter((profile) => {
      const prefs = prefByUser.get(profile.user_id);
      return (
        Boolean(profile.onboarding_completed) &&
        isEnabled(prefs?.reactivation_emails_enabled) &&
        !recentlyActiveUsers.has(profile.user_id) &&
        isoOlderThanDays(profile.last_seen_at, 14, { treatMissingAsOld: true }) &&
        isoOlderThanDays(prefs?.last_reactivation_email_at, 14, { treatMissingAsOld: true })
      );
    });

    await runCampaign(
      "reactivation",
      reactivationCandidates,
      (profile) => {
        const email = buildReactivationEmail(profile, siteUrl);
        return {
          ...email,
          meta: {
            campaign_context: "inactive_user_reengagement",
            last_seen_at: profile.last_seen_at,
          },
        };
      },
      `reactivation:${todayKey}`,
      "last_reactivation_email_at"
    );
  }

  if (includesCampaign("daily_job_alert")) {
    if (recentJobs.length === 0) {
      summaries.push({
        campaign: "daily_job_alert",
        candidates: 0,
        processed: 0,
        would_send: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      });
    } else {
      const jobAlertCandidates = profiles.filter((profile) => {
        const prefs = prefByUser.get(profile.user_id);
        return (
          Boolean(profile.onboarding_completed) &&
          isEnabled(prefs?.job_alerts_enabled) &&
          isoToDay(prefs?.last_job_alert_at) !== todayKey
        );
      });

      await runCampaign(
        "daily_job_alert",
        jobAlertCandidates,
        (profile) => {
          const email = buildDailyJobAlert(profile, recentJobs, siteUrl);
          return {
            ...email,
            meta: {
              campaign_context: "daily_published_jobs",
              jobs_count: recentJobs.length,
              jobs_preview: recentJobs.slice(0, 5).map((job) => ({
                id: job.id,
                title: job.title,
                hospital_name: job.hospital_name,
              })),
            },
          };
        },
        `daily_job_alert:${todayKey}`,
        "last_job_alert_at"
      );
    }
  }

  return jsonResponse({
    success: true,
    dry_run: dryRun,
    campaigns_requested: requestedCampaigns,
    limit_per_campaign: limitPerCampaign,
    jobs_published_last_24h: recentJobs.length,
    profiles_loaded: profiles.length,
    timestamp: nowIso,
    summaries,
  });
});
