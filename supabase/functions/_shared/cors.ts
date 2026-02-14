/**
 * CORS Configuration for Supabase Edge Functions
 * Restricts access to authorized domains only (GDPR Security Requirement)
 */

const PRODUCTION_ORIGINS = [
  "https://klaro.tools",
  "https://www.klaro.tools",
];

const DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

const isLocalDevOrigin = (origin: string): boolean => {
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

export const corsHeaders = (req: Request) => {
  // Get allowed origins from environment variable or use defaults
  const envAllowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Combine environment origins with hardcoded production origins
  const allowedOrigins = envAllowedOrigins.length > 0
    ? envAllowedOrigins
    : PRODUCTION_ORIGINS;

  const origin = req.headers.get("Origin") ?? "";

  // Determine if origin is allowed
  const allowOrigin = !origin
    ? PRODUCTION_ORIGINS[0] // Default to main production domain
    : origin === "null"
      ? PRODUCTION_ORIGINS[0] // Reject null origin, use default
      : allowedOrigins.includes(origin) ||
        DEVELOPMENT_ORIGINS.includes(origin) ||
        isLocalDevOrigin(origin)
        ? origin
        : PRODUCTION_ORIGINS[0]; // Reject unauthorized origins, use default

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Vary": "Origin",
  };
};

export const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req), status: 204 });
  }
  return null;
};
