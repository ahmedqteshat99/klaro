import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const isLocalDevOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
      return true;
    }
    if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
};

const corsHeaders = (req: Request) => {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = !origin
    ? "*"
    : origin === "null"
      ? "*"
      : allowedOrigins.length === 0 || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)
      ? origin
      : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

const sanitizeAliasPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/[.]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

const extractEmailLocalPart = (email: string | null | undefined) => {
  if (!email) return "";
  const localPart = email.trim().toLowerCase().split("@")[0] ?? "";
  return sanitizeAliasPart(localPart).slice(0, 32);
};

const buildUserAlias = (params: {
  firstName?: string | null;
  lastName?: string | null;
  profileEmail?: string | null;
  authEmail?: string | null;
  userId: string;
}) => {
  const nameAlias = sanitizeAliasPart(
    [params.firstName, params.lastName].filter(Boolean).join(".")
  );
  if (nameAlias) return nameAlias.slice(0, 24);

  const mailLocalPart = sanitizeAliasPart(
    (params.profileEmail ?? params.authEmail ?? "").split("@")[0] ?? ""
  );
  if (mailLocalPart) return mailLocalPart.slice(0, 24);

  return `user${params.userId.replaceAll("-", "").slice(0, 8)}`;
};

const buildReplyToAddress = (params: { alias: string; mailgunDomain: string }) =>
  `${sanitizeAliasPart(params.alias).slice(0, 32)}@${params.mailgunDomain}`;

const provisionOrLoadKlaroEmail = async (params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  currentKlaroEmail?: string | null;
}) => {
  if (params.currentKlaroEmail?.trim()) {
    return params.currentKlaroEmail.trim().toLowerCase();
  }

  const { data: provisionedEmail, error: provisionError } = await params.supabaseAdmin.rpc(
    "provision_user_alias",
    {
      p_user_id: params.userId,
      p_vorname: params.firstName ?? "",
      p_nachname: params.lastName ?? "",
    }
  );

  if (provisionError) {
    console.warn("Failed to provision alias", provisionError);
    return null;
  }

  if (typeof provisionedEmail === "string" && provisionedEmail.trim()) {
    return provisionedEmail.trim().toLowerCase();
  }

  const { data: refreshedProfile } = await params.supabaseAdmin
    .from("profiles")
    .select("klaro_email")
    .eq("user_id", params.userId)
    .maybeSingle();

  return refreshedProfile?.klaro_email?.trim().toLowerCase() ?? null;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const textToHtml = (text: string) =>
  text
    .split("\n\n")
    .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br/>")}</p>`)
    .join("");

const MAX_REPLY_ATTACHMENTS_BYTES = 10 * 1024 * 1024;

const sanitizeAttachmentName = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "attachment";

interface ReplyAttachmentInput {
  filePath: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

const buildMailgunForm = (params: {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  attachments?: File[];
}) => {
  const form = new FormData();
  form.append("from", `${params.fromName} <${params.fromEmail}>`);
  form.append("to", params.to);
  form.append("subject", params.subject);
  form.append("text", params.text);
  if (params.html) form.append("html", params.html);
  if (params.replyTo) form.append("h:Reply-To", params.replyTo);
  if (params.inReplyTo) form.append("h:In-Reply-To", params.inReplyTo);
  if (params.attachments?.length) {
    params.attachments.forEach((file) => {
      form.append("attachment", file, file.name || "attachment");
    });
  }
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
  replyTo?: string;
  inReplyTo?: string;
  attachments?: File[];
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

type MailgunRoute = {
  id?: string;
  description?: string;
  expression?: string;
  actions?: string[];
};

const escapeRegexForMailgunExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureMailgunInboundCatchAllRoute = async (params: {
  apiBaseUrl: string;
  apiKey: string;
  domain: string;
  inboundWebhookUrl: string;
}) => {
  const auth = btoa(`api:${params.apiKey}`);
  const base = params.apiBaseUrl.replace(/\/+$/, "");
  const description = "klaro-inbound-catchall-v2";
  const escapedDomain = escapeRegexForMailgunExpression(params.domain.toLowerCase());
  const expression = `match_recipient(".*@${escapedDomain}$")`;
  const desiredActions = [`forward("${params.inboundWebhookUrl}")`, "stop()"];

  const listResponse = await fetch(`${base}/v3/routes?limit=100`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!listResponse.ok) {
    const err = await listResponse.text();
    throw new Error(`Mailgun route list failed: ${listResponse.status} ${err}`);
  }

  const listJson = await listResponse.json();
  const routes: MailgunRoute[] = Array.isArray(listJson?.items) ? listJson.items : [];

  const equivalentRouteExists = routes.some((route) => {
    const actions = Array.isArray(route.actions) ? route.actions : [];
    const expressionLower = (route.expression ?? "").toLowerCase();
    const domainToken = `@${params.domain.toLowerCase()}`;
    const escapedDomainToken = `@${escapeRegexForMailgunExpression(params.domain.toLowerCase())}`;
    return (
      (expressionLower.includes(domainToken) || expressionLower.includes(escapedDomainToken)) &&
      actions.includes(`forward("${params.inboundWebhookUrl}")`)
    );
  });
  if (equivalentRouteExists) return;

  const ownedRoute = routes.find((route) => route.description === description);
  const routeForm = new URLSearchParams();
  routeForm.set("priority", "0");
  routeForm.set("description", description);
  routeForm.set("expression", expression);
  desiredActions.forEach((action) => routeForm.append("action", action));

  if (ownedRoute?.id) {
    const updateResponse = await fetch(`${base}/v3/routes/${ownedRoute.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: routeForm.toString(),
    });
    if (!updateResponse.ok) {
      const err = await updateResponse.text();
      throw new Error(`Mailgun route update failed: ${updateResponse.status} ${err}`);
    }
    return;
  }

  const createResponse = await fetch(`${base}/v3/routes`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: routeForm.toString(),
  });
  if (!createResponse.ok) {
    const err = await createResponse.text();
    throw new Error(`Mailgun route create failed: ${createResponse.status} ${err}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
    const mailgunApiBaseUrl = Deno.env.get("MAILGUN_API_BASE_URL") ?? "https://api.eu.mailgun.net";
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
    const inboundWebhookUrl =
      Deno.env.get("MAILGUN_INBOUND_WEBHOOK_URL") ??
      `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/mailgun-inbound`;
    const fromEmail = Deno.env.get("MAILGUN_FROM_EMAIL") ?? "bewerbungen@klaro.tools";
    const fromName = Deno.env.get("MAILGUN_FROM_NAME") ?? "Klaro Bewerbungen";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !mailgunApiKey || !mailgunDomain) {
      throw new Error("Server config missing");
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const {
      applicationId,
      subject,
      text,
      html,
      recipient,
      inReplyToMessageId,
      attachments,
    }: {
      applicationId?: string;
      subject?: string;
      text?: string;
      html?: string;
      recipient?: string;
      inReplyToMessageId?: string;
      attachments?: ReplyAttachmentInput[];
    } = await req.json();

    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId fehlt" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!text || String(text).trim().length === 0) {
      return new Response(JSON.stringify({ error: "Antworttext fehlt" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: application, error: applicationError } = await supabaseAdmin
      .from("applications")
      .select("id, user_id, recipient_email, reply_token, reply_to, status")
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError || !application) {
      return new Response(JSON.stringify({ error: "Bewerbung nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (application.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: latestInbound } = await supabaseAdmin
      .from("application_messages")
      .select("sender, subject, message_id")
      .eq("application_id", application.id)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetRecipient = recipient ?? latestInbound?.sender ?? application.recipient_email;
    if (!targetRecipient) {
      return new Response(JSON.stringify({ error: "Empfänger fehlt" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const inboundSubject = latestInbound?.subject?.trim() ?? "";
    const finalSubject =
      subject?.trim() ||
      (inboundSubject
        ? inboundSubject.toLowerCase().startsWith("re:")
          ? inboundSubject
          : `Re: ${inboundSubject}`
        : "Re: Ihre Nachricht");

    const finalText = String(text).trim();
    const finalHtml = html?.trim() || textToHtml(finalText);

    const replyToken = application.reply_token ?? null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("vorname, nachname, email, klaro_email")
      .eq("user_id", application.user_id)
      .maybeSingle();

    const klaroEmail = await provisionOrLoadKlaroEmail({
      supabaseAdmin,
      userId: application.user_id,
      firstName: profile?.vorname,
      lastName: profile?.nachname,
      currentKlaroEmail: profile?.klaro_email,
    });

    const userAliasFromKlaroEmail = extractEmailLocalPart(klaroEmail ?? profile?.klaro_email);
    const fallbackAlias = buildUserAlias({
      firstName: profile?.vorname,
      lastName: profile?.nachname,
      profileEmail: profile?.email,
      authEmail: userData.user.email,
      userId: application.user_id,
    });
    const userAlias = userAliasFromKlaroEmail || fallbackAlias;

    const replyTo = buildReplyToAddress({
      alias: userAlias,
      mailgunDomain,
    });

    try {
      await ensureMailgunInboundCatchAllRoute({
        apiBaseUrl: mailgunApiBaseUrl,
        apiKey: mailgunApiKey,
        domain: mailgunDomain,
        inboundWebhookUrl,
      });
    } catch (routeError) {
      console.warn("Failed to ensure Mailgun inbound catch-all route", routeError);
    }

    await supabaseAdmin
      .from("applications")
      .update({ reply_token: replyToken, reply_to: replyTo })
      .eq("id", application.id);

    const requestedAttachments = Array.isArray(attachments) ? attachments : [];
    const files: File[] = [];
    let totalAttachmentBytes = 0;

    for (const attachment of requestedAttachments) {
      if (!attachment?.filePath || typeof attachment.filePath !== "string") {
        return new Response(JSON.stringify({ error: "Ungültiger Anhang" }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const normalizedPath = attachment.filePath.replace(/^\/+/, "");
      const allowedPrefix = `${application.user_id}/reply-attachments/${application.id}/`;
      if (!normalizedPath.startsWith(allowedPrefix)) {
        return new Response(JSON.stringify({ error: "Anhang nicht erlaubt" }), {
          status: 403,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const { data: blob, error } = await supabaseAdmin.storage
        .from("user-files")
        .download(normalizedPath);

      if (error || !blob) {
        return new Response(JSON.stringify({ error: `Anhang konnte nicht geladen werden: ${normalizedPath}` }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      totalAttachmentBytes += blob.size;
      if (totalAttachmentBytes > MAX_REPLY_ATTACHMENTS_BYTES) {
        return new Response(JSON.stringify({ error: "Anhänge dürfen zusammen maximal 10 MB sein." }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const fallbackName = normalizedPath.split("/").pop() ?? `attachment-${files.length + 1}`;
      const fileName =
        typeof attachment.fileName === "string" && attachment.fileName.trim()
          ? sanitizeAttachmentName(attachment.fileName.trim())
          : sanitizeAttachmentName(fallbackName);

      files.push(
        new File([blob], fileName, {
          type: attachment.mimeType?.trim() || blob.type || "application/octet-stream",
        })
      );
    }

    const mailgunResponse = await sendMailgunEmail({
      apiBaseUrl: mailgunApiBaseUrl,
      domain: mailgunDomain,
      apiKey: mailgunApiKey,
      fromName,
      fromEmail,
      to: targetRecipient,
      subject: finalSubject,
      text: finalText,
      html: finalHtml,
      replyTo,
      inReplyTo: inReplyToMessageId ?? latestInbound?.message_id ?? undefined,
      attachments: files.length > 0 ? files : undefined,
    });

    await supabaseAdmin.from("application_messages").insert({
      application_id: application.id,
      user_id: application.user_id,
      direction: "outbound",
      subject: finalSubject,
      sender: fromEmail,
      recipient: targetRecipient,
      reply_to: replyTo,
      message_id: mailgunResponse?.id ?? null,
      provider_message_id: mailgunResponse?.id ?? null,
      text_body: finalText,
      html_body: finalHtml,
    });

    return new Response(JSON.stringify({ success: true, message: mailgunResponse?.message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("reply-application-email error", error);
    const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
