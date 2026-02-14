import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const verifyMailgunSignature = async (
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
) => {
  if (!signingKey || !timestamp || !token || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}${token}`));
  const expected = toHex(mac);
  return expected === signature;
};

const buildMailgunForm = (
  fromName: string,
  fromEmail: string,
  to: string,
  subject: string,
  text: string,
  html?: string,
  replyTo?: string,
  attachments?: File[]
) => {
  const form = new FormData();
  form.append("from", `${fromName} <${fromEmail}>`);
  form.append("to", to);
  form.append("subject", subject);
  form.append("text", text);
  if (html) form.append("html", html);
  if (replyTo) form.append("h:Reply-To", replyTo);
  if (attachments?.length) {
    attachments.forEach((file) => {
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
  attachments?: File[];
}) => {
  const form = buildMailgunForm(
    params.fromName,
    params.fromEmail,
    params.to,
    params.subject,
    params.text,
    params.html,
    params.replyTo,
    params.attachments
  );

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

interface ParsedRecipient {
  applicationId: string | null;
  appShortId: string | null;
  replyToken: string | null;
  alias: string | null;
  isBareAlias?: boolean;
}

const extractRecipientAddress = (input: string) => {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  const angleMatch = raw.match(/<\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\s*>/i);
  if (angleMatch?.[1]) {
    return angleMatch[1].toLowerCase();
  }

  const plainMatch = raw.match(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].toLowerCase();
  }

  return raw.toLowerCase();
};

const extractEmailLocalPart = (email: string) => {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized.includes("@")) return "";
  return normalized.split("@")[0] ?? "";
};

const parseReplyRecipient = (recipient: string): ParsedRecipient | null => {
  const match = recipient.match(/([^@]+)@/i);
  if (!match) return null;

  const localPart = match[1].replace(/^reply\+/i, "");

  // Legacy format: [reply+]<applicationUuid>-<token>@klaro.tools
  const legacyMatch = localPart.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([a-z0-9]{8,64})$/i
  );
  if (legacyMatch) {
    return {
      applicationId: legacyMatch[1],
      replyToken: legacyMatch[2],
      appShortId: null,
      alias: null,
    };
  }

  // Friendly format: [reply+]<alias>.<appShortId>.<token>@klaro.tools
  const friendlyMatch = localPart.match(
    /^([a-z0-9._-]+)\.([0-9a-f]{8})\.([a-z0-9]{8,64})$/i
  );
  if (friendlyMatch) {
    return {
      applicationId: null,
      appShortId: friendlyMatch[2].toLowerCase(),
      replyToken: friendlyMatch[3],
      alias: friendlyMatch[1].toLowerCase(),
    };
  }

  // Short format: [reply+]<alias>.<token>@klaro.tools
  // Token is 8-64 alphanumeric chars. Alias contains dots/dashes.
  // We match the LAST dot-separated segment of 8-64 alnum chars as the token.
  const shortMatch = localPart.match(
    /^([a-z0-9._-]+)\.([a-z0-9]{8,64})$/i
  );
  // Guard: avoid false positives like firstname.lastname where last name length is 8+.
  // Legacy tokens include digits; natural names typically don't.
  if (shortMatch && /\d/.test(shortMatch[2])) {
    return {
      applicationId: null,
      appShortId: null,
      replyToken: shortMatch[2],
      alias: shortMatch[1].toLowerCase(),
    };
  }

  // Bare user alias: firstname.lastname@domain (no token segment)
  // Must be at least 2 chars, start with a letter, only alnum/dot/dash/underscore.
  const bareAliasMatch = localPart.match(
    /^([a-z][a-z0-9._-]{0,30}[a-z0-9])$/i
  );
  if (bareAliasMatch) {
    return {
      applicationId: null,
      appShortId: null,
      replyToken: null,
      alias: bareAliasMatch[1].toLowerCase(),
      isBareAlias: true,
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Smart routing: multi-signal scoring
// ---------------------------------------------------------------------------

interface RoutingSignal {
  type: string;
  weight: number;
  matched_value?: string;
  application_id?: string;
}

interface RoutingResult {
  applicationId: string | null;
  confidence: "high" | "medium" | "low" | null;
  signals: RoutingSignal[];
}

function extractMessageIds(headerValue: string): string[] {
  if (!headerValue) return [];
  const matches = headerValue.match(/<[^>]+>/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

async function smartRouteToApplication(
  supabase: SupabaseClient,
  userId: string,
  senderEmail: string,
  subject: string,
  inReplyTo: string,
  references: string
): Promise<RoutingResult> {
  const signals: RoutingSignal[] = [];

  // Fetch user's active applications
  const { data: applications } = await supabase
    .from("applications")
    .select("id, job_id, recipient_email, subject, status, updated_at")
    .eq("user_id", userId)
    .in("status", ["sent", "queued", "replied"])
    .order("updated_at", { ascending: false });

  if (!applications || applications.length === 0) {
    return { applicationId: null, confidence: null, signals: [] };
  }

  // --- Signal 1: In-Reply-To / References header match (weight: 100) ---
  const headerMessageIds = [
    ...extractMessageIds(inReplyTo),
    ...extractMessageIds(references),
  ];

  if (headerMessageIds.length > 0) {
    const orFilter = headerMessageIds
      .flatMap((mid) => [`message_id.eq.${mid}`, `provider_message_id.eq.${mid}`])
      .join(",");

    const { data: matchedMessages } = await supabase
      .from("application_messages")
      .select("application_id, message_id, provider_message_id")
      .or(orFilter);

    if (matchedMessages && matchedMessages.length > 0) {
      const appId = matchedMessages[0].application_id;
      if (appId) {
        signals.push({
          type: "header_match",
          weight: 100,
          matched_value: matchedMessages[0].message_id ?? matchedMessages[0].provider_message_id ?? undefined,
          application_id: appId,
        });
        return { applicationId: appId, confidence: "high", signals };
      }
    }
  }

  // --- Signal 2: Sender email exact match (weight: 80) ---
  const senderNormalized = senderEmail.toLowerCase().trim();
  for (const app of applications) {
    if (app.recipient_email?.toLowerCase().trim() === senderNormalized) {
      signals.push({
        type: "sender_exact",
        weight: 80,
        matched_value: app.recipient_email,
        application_id: app.id,
      });
    }
  }

  // --- Signal 3: Sender domain match (weight: 40) ---
  const senderDomain = senderNormalized.split("@")[1] ?? "";
  if (senderDomain) {
    const exactMatchIds = new Set(
      signals.filter((s) => s.type === "sender_exact").map((s) => s.application_id)
    );
    for (const app of applications) {
      if (exactMatchIds.has(app.id)) continue;
      const appDomain = (app.recipient_email ?? "").toLowerCase().split("@")[1] ?? "";
      if (appDomain === senderDomain) {
        signals.push({
          type: "sender_domain",
          weight: 40,
          matched_value: senderDomain,
          application_id: app.id,
        });
      }
    }
  }

  // --- Signal 4: Subject keyword match (weight: 30) ---
  const jobIds = [...new Set(applications.map((a) => a.job_id).filter(Boolean))];
  let jobsMap: Record<string, { title: string; hospital_name: string }> = {};
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, hospital_name")
      .in("id", jobIds);
    if (jobs) {
      jobsMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
    }
  }

  const subjectLower = (subject ?? "").toLowerCase();
  for (const app of applications) {
    const job = jobsMap[app.job_id];
    if (!job) continue;
    const keywords = [job.title, job.hospital_name, app.subject].filter(Boolean).map((k) =>
      k!.toLowerCase()
    );

    for (const keyword of keywords) {
      if (keyword.length >= 4 && subjectLower.includes(keyword)) {
        signals.push({
          type: "subject_keyword",
          weight: 30,
          matched_value: keyword,
          application_id: app.id,
        });
        break;
      }
    }
  }

  // --- Signal 5: Recency bias (weight: 20 for most recent, 10 for 2nd) ---
  if (applications.length >= 1) {
    signals.push({ type: "recency", weight: 20, application_id: applications[0].id });
  }
  if (applications.length >= 2) {
    signals.push({ type: "recency", weight: 10, application_id: applications[1].id });
  }

  // --- Score aggregation ---
  const scoreMap: Record<string, number> = {};
  for (const signal of signals) {
    if (signal.application_id) {
      scoreMap[signal.application_id] = (scoreMap[signal.application_id] ?? 0) + signal.weight;
    }
  }

  const ranked = Object.entries(scoreMap).sort(([, a], [, b]) => b - a);

  if (ranked.length === 0) {
    return { applicationId: null, confidence: null, signals };
  }

  const [bestAppId, bestScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const scoreDelta = bestScore - secondScore;

  let confidence: "high" | "medium" | "low";
  if (bestScore >= 80) {
    confidence = "high";
  } else if (bestScore >= 50 && scoreDelta >= 20) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Only auto-link for high/medium confidence
  const applicationId = confidence !== "low" ? bestAppId : null;

  return { applicationId, confidence, signals };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signingKey = Deno.env.get("MAILGUN_WEBHOOK_SIGNING_KEY") ?? "";
  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
  const mailgunApiBaseUrl = Deno.env.get("MAILGUN_API_BASE_URL") ?? "https://api.eu.mailgun.net";
  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
  const fromEmail = Deno.env.get("MAILGUN_FROM_EMAIL") ?? "bewerbungen@klaro.tools";
  const fromName = Deno.env.get("MAILGUN_FROM_NAME") ?? "Klaro Bewerbungen";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!signingKey || !mailgunApiKey || !mailgunDomain || !supabaseUrl || !serviceRoleKey) {
    console.error("Missing required env vars for mailgun-inbound");
    return new Response("Server misconfigured", { status: 500 });
  }

  const formData = await req.formData();
  const timestamp = formData.get("timestamp")?.toString() ?? "";
  const token = formData.get("token")?.toString() ?? "";
  const signature = formData.get("signature")?.toString() ?? "";

  const validSignature = await verifyMailgunSignature(signingKey, timestamp, token, signature);
  if (!validSignature) {
    console.warn("Invalid Mailgun signature");
    return new Response("Invalid signature", { status: 403 });
  }

  const recipientRaw = formData.get("recipient")?.toString() ?? "";
  const recipient = extractRecipientAddress(recipientRaw);
  const sender = formData.get("sender")?.toString() ?? "";
  const subject = formData.get("subject")?.toString() ?? "(ohne Betreff)";
  const textBody = formData.get("body-plain")?.toString() ?? "";
  const htmlBody = formData.get("body-html")?.toString() ?? "";
  const messageId =
    formData.get("Message-Id")?.toString() ??
    formData.get("message-id")?.toString() ??
    "";

  // Extract threading headers from Mailgun form data
  const inReplyTo =
    formData.get("In-Reply-To")?.toString() ??
    formData.get("in-reply-to")?.toString() ??
    "";
  const references =
    formData.get("References")?.toString() ??
    formData.get("references")?.toString() ??
    "";

  if (!recipient || !recipient.includes("@")) {
    console.warn("Inbound recipient missing/invalid", recipientRaw);
    return new Response("Recipient not recognized", { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  let application: { id: string; user_id: string; reply_token: string | null } | null = null;
  let replyToken: string | null = null;
  let fallbackUserIdFromReplyTo: string | null = null;

  // First try exact recipient match for robust routing across address formats.
  const { data: byReplyTo, error: byReplyToError } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, reply_token")
    .ilike("reply_to", recipient);

  if (byReplyToError) {
    console.error("Application lookup by reply_to failed", byReplyToError);
    return new Response("Application lookup failed", { status: 500 });
  }

  if (byReplyTo && byReplyTo.length > 1) {
    console.warn("Multiple applications found for reply_to, falling back to parsed/smart routing", recipient);
    const uniqueUserIds = Array.from(new Set(byReplyTo.map((row) => row.user_id).filter(Boolean)));
    if (uniqueUserIds.length === 1) {
      fallbackUserIdFromReplyTo = uniqueUserIds[0];
    }
  } else if (byReplyTo && byReplyTo.length === 1) {
    application = byReplyTo[0];
    replyToken = application.reply_token;
  }

  // Parse recipient to determine routing path
  const parsedRecipient = !application ? parseReplyRecipient(recipient) : null;

  // --- Path A: Token-based routing (existing logic) ---
  if (!application && parsedRecipient && !parsedRecipient.isBareAlias) {
    const { applicationId, appShortId, replyToken: parsedToken, alias } = parsedRecipient;
    replyToken = parsedToken;

    if (applicationId) {
      const { data: byId, error: byIdError } = await supabaseAdmin
        .from("applications")
        .select("id, user_id, reply_token")
        .eq("id", applicationId)
        .maybeSingle();

      if (byIdError || !byId) {
        console.error("Application not found", byIdError);
        return new Response("Application not found", { status: 404 });
      }

      application = byId;
    } else if (parsedToken) {
      const { data: candidates, error: candidatesError } = await supabaseAdmin
        .from("applications")
        .select("id, user_id, reply_token, reply_to")
        .eq("reply_token", parsedToken);

      if (candidatesError || !candidates || candidates.length === 0) {
        console.error("Application candidates not found", candidatesError);
        return new Response("Application not found", { status: 404 });
      }

      if (appShortId) {
        application =
          candidates.find((item) => item.id.toLowerCase().startsWith(appShortId)) ?? null;
      } else if (alias) {
        application =
          candidates.find((item) =>
            (item.reply_to ?? "").toLowerCase().includes(`${alias}.`)
          ) ?? null;
      } else {
        application = candidates.length === 1 ? candidates[0] : null;
      }

      if (!application) {
        console.warn("No application candidate matched recipient pattern");
        return new Response("Application not found", { status: 404 });
      }
    }
  }

  // --- Path B: Bare alias routing (NEW - smart routing) ---
  if (!application && parsedRecipient?.isBareAlias && parsedRecipient.alias) {
    const normalizedRecipient = recipient.trim().toLowerCase();
    const localPart = extractEmailLocalPart(normalizedRecipient);
    let aliasUserId: string | null = null;

    // Prefer exact address match first.
    const { data: aliasRow } = await supabaseAdmin
      .from("user_email_aliases")
      .select("user_id")
      .ilike("full_address", normalizedRecipient)
      .eq("is_active", true)
      .maybeSingle();

    if (aliasRow?.user_id) {
      aliasUserId = aliasRow.user_id;
    } else {
      // Fallback to profiles.klaro_email to support users provisioned before alias table population.
      const { data: profileAliasRow } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("klaro_email", normalizedRecipient)
        .maybeSingle();
      aliasUserId = profileAliasRow?.user_id ?? null;
    }

    if (!aliasUserId && localPart) {
      // Support historical aliases that match the user's personal email local-part.
      const { data: byPersonalEmailLocalPart } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("email", `${localPart}@%`)
        .limit(2);

      if (byPersonalEmailLocalPart?.length === 1) {
        aliasUserId = byPersonalEmailLocalPart[0].user_id;
      }
    }

    if (!aliasUserId) {
      // Last fallback for historical aliases that may be inactive in alias registry.
      const { data: anyAliasRow } = await supabaseAdmin
        .from("user_email_aliases")
        .select("user_id")
        .ilike("full_address", normalizedRecipient)
        .limit(2);
      if (anyAliasRow?.length === 1) {
        aliasUserId = anyAliasRow[0].user_id;
      }
    }

    if (!aliasUserId && fallbackUserIdFromReplyTo) {
      aliasUserId = fallbackUserIdFromReplyTo;
    }

    if (!aliasUserId) {
      console.warn("Bare alias not found:", normalizedRecipient);
      return new Response("Alias not found", { status: 404 });
    }

    // Run smart routing
    const routingResult = await smartRouteToApplication(
      supabaseAdmin,
      aliasUserId,
      sender,
      subject,
      inReplyTo,
      references
    );

    console.log("Smart routing result:", {
      alias: normalizedRecipient,
      userId: aliasUserId,
      applicationId: routingResult.applicationId,
      confidence: routingResult.confidence,
      signalCount: routingResult.signals.length,
    });

    // Collect attachments
    const attachmentCount = Number(formData.get("attachment-count")?.toString() ?? "0");
    const attachments: File[] = [];
    for (let i = 1; i <= attachmentCount; i += 1) {
      const file = formData.get(`attachment-${i}`);
      if (file instanceof File) attachments.push(file);
    }

    const payload = { recipient, sender, subject, messageId, timestamp, attachmentCount };
    const payloadWithRawRecipient = { ...payload, recipient_raw: recipientRaw };
    const headersObj = { "In-Reply-To": inReplyTo, References: references };

    // Insert message (application_id may be null for unlinked)
    const { error: insertError } = await supabaseAdmin.from("application_messages").insert({
      application_id: routingResult.applicationId,
      user_id: aliasUserId,
      direction: "inbound",
      subject,
      sender,
      recipient,
      message_id: messageId,
      text_body: textBody,
      html_body: htmlBody,
      headers: headersObj,
      match_confidence: routingResult.confidence,
      match_signals: routingResult.signals,
      payload: payloadWithRawRecipient,
    });

    if (insertError) {
      console.error("Failed to insert smart-routed message", insertError);
      return new Response("Failed to record message", { status: 500 });
    }

    // Update application status if linked
    if (routingResult.applicationId) {
      await supabaseAdmin
        .from("applications")
        .update({ status: "replied" })
        .eq("id", routingResult.applicationId);
    }

    // Forward to user's personal email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("user_id", aliasUserId)
      .maybeSingle();

    const userEmail =
      profile?.email ??
      (await supabaseAdmin.auth.admin.getUserById(aliasUserId)).data.user?.email ??
      "";

    if (userEmail) {
      const confidenceNote =
        routingResult.confidence === "low" || !routingResult.applicationId
          ? "\n\nHinweis: Diese Nachricht konnte nicht eindeutig einer Bewerbung zugeordnet werden. Bitte prüfen Sie Ihre Inbox in der App."
          : "";

      const forwardIntroText =
        `Weitergeleitete Antwort zu deiner Bewerbung.\n\n` +
        `Von: ${sender}\n` +
        `Betreff: ${subject}${confidenceNote}\n\n`;

      const forwardIntroHtml =
        `<div style="font-family: Arial, sans-serif; font-size: 14px;">` +
        `<p><strong>Weitergeleitete Antwort zu deiner Bewerbung.</strong></p>` +
        `<p>Von: ${sender}<br/>Betreff: ${subject}</p>` +
        (confidenceNote
          ? `<p style="color: #b45309;"><em>Hinweis: Diese Nachricht konnte nicht eindeutig einer Bewerbung zugeordnet werden. Bitte prüfen Sie Ihre Inbox in der App.</em></p>`
          : "") +
        `</div>`;

      try {
        await sendMailgunEmail({
          apiBaseUrl: mailgunApiBaseUrl,
          domain: mailgunDomain,
          apiKey: mailgunApiKey,
          fromName,
          fromEmail,
          to: userEmail,
          subject: `Antwort auf deine Bewerbung: ${subject}`,
          text: `${forwardIntroText}${textBody}`,
          html: `${forwardIntroHtml}${htmlBody ? `<hr/>${htmlBody}` : ""}`,
          replyTo: sender,
          attachments,
        });
      } catch (error) {
        console.error("Failed to forward smart-routed reply to user", error);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- No recognized format ---
  if (!application && !parsedRecipient) {
    return new Response("Recipient not recognized", { status: 400 });
  }

  if (!application) {
    return new Response("Application not found", { status: 404 });
  }

  if (replyToken && (!application.reply_token || application.reply_token !== replyToken)) {
    console.warn("Reply token mismatch");
    return new Response("Unauthorized", { status: 403 });
  }

  // --- Token-based path: insert message (existing flow, enhanced) ---
  const attachmentCount = Number(formData.get("attachment-count")?.toString() ?? "0");
  const attachments: File[] = [];
  for (let i = 1; i <= attachmentCount; i += 1) {
    const file = formData.get(`attachment-${i}`);
    if (file instanceof File) {
      attachments.push(file);
    }
  }

  const payload = {
    recipient,
    recipient_raw: recipientRaw,
    sender,
    subject,
    messageId,
    timestamp,
    attachmentCount,
  };

  const headersObj = { "In-Reply-To": inReplyTo, References: references };

  const { error: insertError } = await supabaseAdmin.from("application_messages").insert({
    application_id: application.id,
    user_id: application.user_id,
    direction: "inbound",
    subject,
    sender,
    recipient,
    message_id: messageId,
    text_body: textBody,
    html_body: htmlBody,
    headers: headersObj,
    match_confidence: "high",
    match_signals: [{ type: "token_match", weight: 100 }],
    payload,
  });

  if (insertError) {
    console.error("Failed to insert inbound message", insertError);
    return new Response("Failed to record message", { status: 500 });
  }

  await supabaseAdmin
    .from("applications")
    .update({ status: "replied" })
    .eq("id", application.id);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("user_id", application.user_id)
    .maybeSingle();

  const userEmail =
    profile?.email ??
    (await supabaseAdmin.auth.admin.getUserById(application.user_id)).data.user?.email ??
    "";

  if (userEmail) {
    const forwardIntroText =
      `Weitergeleitete Antwort zu deiner Bewerbung.\n\n` +
      `Von: ${sender}\n` +
      `Betreff: ${subject}\n\n`;

    const forwardIntroHtml =
      `<div style="font-family: Arial, sans-serif; font-size: 14px;">` +
      `<p><strong>Weitergeleitete Antwort zu deiner Bewerbung.</strong></p>` +
      `<p>Von: ${sender}<br/>Betreff: ${subject}</p>` +
      `</div>`;

    try {
      await sendMailgunEmail({
        apiBaseUrl: mailgunApiBaseUrl,
        domain: mailgunDomain,
        apiKey: mailgunApiKey,
        fromName,
        fromEmail,
        to: userEmail,
        subject: `Antwort auf deine Bewerbung: ${subject}`,
        text: `${forwardIntroText}${textBody}`,
        html: `${forwardIntroHtml}${htmlBody ? `<hr/>${htmlBody}` : ""}`,
        replyTo: sender,
        attachments,
      });
    } catch (error) {
      console.error("Failed to forward reply to user", error);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
