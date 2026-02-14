import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type MailgunRoute = {
  id?: string;
  description?: string;
  expression?: string;
  actions?: string[];
};

const escapeRegexForMailgunExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mailgunFetchJson = async (params: {
  apiBaseUrl: string;
  apiKey: string;
  pathWithQuery: string;
}) => {
  const auth = btoa(`api:${params.apiKey}`);
  const base = params.apiBaseUrl.replace(/\/+$/, "");
  const response = await fetch(`${base}${params.pathWithQuery}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mailgun API failed: ${response.status} ${err}`);
  }
  return response.json();
};

const getRoutes = async (params: {
  apiBaseUrl: string;
  apiKey: string;
}) => {
  const listJson = await mailgunFetchJson({
    apiBaseUrl: params.apiBaseUrl,
    apiKey: params.apiKey,
    pathWithQuery: "/v3/routes?limit=100",
  });
  return Array.isArray(listJson?.items) ? (listJson.items as MailgunRoute[]) : [];
};

const getRecentEvents = async (params: {
  apiBaseUrl: string;
  apiKey: string;
  domain: string;
  limit?: number;
  recipient?: string | null;
}) => {
  const q = new URLSearchParams();
  q.set("ascending", "no");
  q.set("limit", String(params.limit ?? 25));
  if (params.recipient) q.set("recipient", params.recipient);

  const eventsJson = await mailgunFetchJson({
    apiBaseUrl: params.apiBaseUrl,
    apiKey: params.apiKey,
    pathWithQuery: `/v3/${params.domain}/events?${q.toString()}`,
  });

  return Array.isArray(eventsJson?.items) ? eventsJson.items : [];
};

const syncCatchAllRoute = async (params: {
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
  const forwardAction = `forward("${params.inboundWebhookUrl}")`;

  const routes = await getRoutes({
    apiBaseUrl: params.apiBaseUrl,
    apiKey: params.apiKey,
  });
  const domainToken = `@${params.domain.toLowerCase()}`;
  const escapedDomainToken = `@${escapeRegexForMailgunExpression(params.domain.toLowerCase())}`;

  const equivalentRoute = routes.find((route) => {
    const actions = Array.isArray(route.actions) ? route.actions : [];
    const expressionLower = (route.expression ?? "").toLowerCase();
    return (
      (expressionLower.includes(domainToken) || expressionLower.includes(escapedDomainToken)) &&
      actions.includes(forwardAction)
    );
  });

  if (equivalentRoute) {
    return {
      updated: false,
      routeId: equivalentRoute.id ?? null,
      expression: equivalentRoute.expression ?? null,
      actions: equivalentRoute.actions ?? [],
      reason: "equivalent_route_exists",
    };
  }

  const ownedRoute = routes.find((route) => route.description === description);
  const routeToUpdate = ownedRoute ?? routes[0];
  const routeForm = new URLSearchParams();
  routeForm.set("priority", "0");
  routeForm.set("description", description);
  routeForm.set("expression", expression);
  desiredActions.forEach((action) => routeForm.append("action", action));

  if (routeToUpdate?.id) {
    const updateResponse = await fetch(`${base}/v3/routes/${routeToUpdate.id}`, {
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

    const updateJson = await updateResponse.json();
    const updatedRoute = updateJson?.route ?? updateJson?.message ?? updateJson;
    return {
      updated: true,
      routeId: routeToUpdate.id,
      expression,
      actions: desiredActions,
      reason: ownedRoute?.id ? "owned_route_updated" : "existing_route_replaced",
      providerResponse: updatedRoute,
    };
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

  const createJson = await createResponse.json();
  return {
    updated: true,
    routeId: createJson?.route?.id ?? createJson?.id ?? null,
    expression,
    actions: desiredActions,
    reason: "route_created",
    providerResponse: createJson,
  };
};

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY") ?? "";
  const mailgunApiBaseUrl = Deno.env.get("MAILGUN_API_BASE_URL") ?? "https://api.eu.mailgun.net";
  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const inboundWebhookUrl =
    Deno.env.get("MAILGUN_INBOUND_WEBHOOK_URL") ??
    `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/mailgun-inbound`;

  if (!mailgunApiKey || !mailgunDomain) {
    return jsonResponse(500, { error: "Missing MAILGUN_API_KEY or MAILGUN_DOMAIN" });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const recipient = url.searchParams.get("recipient");
      const routes = await getRoutes({
        apiBaseUrl: mailgunApiBaseUrl,
        apiKey: mailgunApiKey,
      });
      const events = await getRecentEvents({
        apiBaseUrl: mailgunApiBaseUrl,
        apiKey: mailgunApiKey,
        domain: mailgunDomain,
        limit: 50,
        recipient,
      });

      return jsonResponse(200, {
        success: true,
        domain: mailgunDomain,
        recipientFilter: recipient,
        routes: routes.map((route) => ({
          id: route.id,
          description: route.description,
          expression: route.expression,
          actions: route.actions,
        })),
        events,
      });
    }

    const result = await syncCatchAllRoute({
      apiBaseUrl: mailgunApiBaseUrl,
      apiKey: mailgunApiKey,
      domain: mailgunDomain,
      inboundWebhookUrl,
    });

    return jsonResponse(200, {
      success: true,
      domain: mailgunDomain,
      inboundWebhookUrl,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return jsonResponse(500, { success: false, error: message });
  }
});
