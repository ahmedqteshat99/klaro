import { supabase } from "@/integrations/supabase/client";
import { logSlowEndpoint } from "@/lib/app-events";
import type { Profile, WorkExperience, EducationEntry, PracticalExperience, Certification, Publication } from "@/hooks/useProfile";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const EDGE_AUTH_EXPIRY_MARGIN_SECONDS = 120;

const redirectToAuth = () => {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/auth")) return;

  const next = `${window.location.pathname}${window.location.search}${window.location.hash ?? ""}`;
  const url = new URL("/auth", window.location.origin);
  url.searchParams.set("next", next);
  window.location.assign(url.toString());
};

/**
 * Ensure a valid (non-expired) user session exists before calling an edge function.
 * If the access token is expired or expiring soon, forces a refresh.
 * Throws a German-language error when no session can be obtained so callers
 * surface a meaningful message instead of the cryptic "missing sub claim".
 */
async function ensureFreshSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Nicht angemeldet. Bitte melden Sie sich erneut an.");
  }

  const expiresAt = session.expires_at; // unix seconds
  const now = Math.floor(Date.now() / 1000);

  if (!expiresAt || expiresAt - now < EDGE_AUTH_EXPIRY_MARGIN_SECONDS) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error("Sitzung abgelaufen. Bitte melden Sie sich erneut an.");
    }
  }
}

async function invokeEdgeFunction<T>(
  name: string,
  body?: unknown,
  retry = true
): Promise<{ data?: T; error?: string; status: number }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { error: "Supabase ist nicht konfiguriert.", status: 500 };
  }

  try {
    const { data, error } = await supabase.functions.invoke<T>(name, { body });

    if (!error) {
      return { data: data as T, status: 200 };
    }

    const status = (error as { context?: { status?: number } })?.context?.status ?? 500;

    if (status === 401 && retry) {
      console.warn("Edge Function returned 401. Attempting session refresh...");

      // Force a refresh of the session and retry once with the new access token.
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshedSession?.access_token) {
        console.error("Session refresh failed during 401 retry:", refreshError);
        return { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.", status: 401 };
      }

      return invokeEdgeFunction<T>(name, body, false);
    }

    if (status === 401) {
      return { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.", status: 401 };
    }

    return { error: getInvokeErrorMessage(error), status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return { error: message, status: 500 };
  }
}

/** Extract server error message from Edge Function invoke error (4xx/5xx response body). */
function getInvokeErrorMessage(error: unknown): string {
  const err = error as { context?: { body?: string }; message?: string };
  const body = err?.context?.body;
  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string };
      if (typeof parsed?.error === "string" && parsed.error.trim()) {
        return parsed.error;
      }
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      // ignore parse failure
    }
  }
  return err?.message ?? "Unbekannter Fehler";
}

interface GenerateCVParams {
  profile: Profile | null;
  workExperiences: WorkExperience[];
  educationEntries: EducationEntry[];
  practicalExperiences: PracticalExperience[];
  certifications: Certification[];
  publications: Publication[];
}

export interface JobData {
  krankenhaus: string | null;
  standort: string | null;
  fachabteilung: string | null;
  position: string | null;
  ansprechpartner: string | null;
  anforderungen: string | null;
  title?: string | null;
  hospital_name?: string | null;
  department?: string | null;
  location?: string | null;
  description?: string | null;
  requirements?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  apply_url?: string | null;
  tags?: string[] | string | null;
}

interface GenerateAnschreibenParams extends GenerateCVParams {
  jobData: JobData;
  userPreferences?: string[];
}

export const generateCV = async (params: GenerateCVParams): Promise<{ success: boolean; html?: string; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error, status } = await invokeEdgeFunction<{ success: boolean; html?: string; error?: string }>(
    "generate-cv",
    params
  );
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("generate-cv", durationMs, { ok: !error, status });
  }

  if (error || !data) {
    console.error('Generate CV error:', error);
    return { success: false, error: error || "Unbekannter Fehler" };
  }

  return data;
};

export const extractJobData = async (
  params: { url?: string; rawText?: string }
): Promise<{ success: boolean; data?: JobData; rawContent?: string; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error, status } = await invokeEdgeFunction<{
    success: boolean;
    data?: JobData;
    rawContent?: string;
    error?: string;
  }>("extract-job", params);
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("extract-job", durationMs, { ok: !error, status });
  }

  if (error || !data) {
    console.error('Extract job error:', error);
    return { success: false, error: error || "Unbekannter Fehler" };
  }

  return data;
};

export const generateAnschreiben = async (params: GenerateAnschreibenParams): Promise<{ success: boolean; html?: string; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error, status } = await invokeEdgeFunction<{ success: boolean; html?: string; error?: string }>(
    "generate-anschreiben",
    params
  );
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("generate-anschreiben", durationMs, { ok: !error, status });
  }

  if (error || !data) {
    console.error('Generate Anschreiben error:', error);
    return { success: false, error: error || "Unbekannter Fehler" };
  }

  return data;
};

export const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error, status } = await invokeEdgeFunction<{ success: boolean; error?: string }>(
    "delete-account"
  );
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("delete-account", durationMs, { ok: !error, status });
  }

  if (error || !data) {
    console.error('Delete account error:', error);
    return { success: false, error: error || "Unbekannter Fehler" };
  }

  return data;
};

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface EnhanceAnschreibenParams {
  currentHtml: string | null;
  userMessage: string;
  conversationHistory?: ConversationMessage[];
}

export const enhanceAnschreiben = async (
  params: EnhanceAnschreibenParams
): Promise<{ success: boolean; message?: string; updatedHtml?: string | null; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error, status } = await invokeEdgeFunction<{
    success: boolean;
    message?: string;
    updatedHtml?: string | null;
    error?: string;
  }>("enhance-anschreiben", params);
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("enhance-anschreiben", durationMs, { ok: !error, status });
  }

  if (error || !data) {
    console.error('Enhance Anschreiben error:', error);
    return { success: false, error: error || "Unbekannter Fehler" };
  }

  return data;
};

/**
 * Backfill AI-generated descriptions for all jobs with null/empty descriptions.
 * Admin-only operation.
 */
export async function backfillJobDescriptions(): Promise<{
  success: boolean;
  total?: number;
  updated?: number;
  failed?: number;
  errors?: string[];
  message?: string;
  error?: string;
}> {
  await ensureFreshSession();

  const result = await invokeEdgeFunction<{
    success: boolean;
    total?: number;
    updated?: number;
    failed?: number;
    errors?: string[];
    message?: string;
  }>("backfill-job-descriptions", {});

  if (result.error) {
    return { success: false, error: result.error };
  }

  return result.data ?? { success: false, error: "Keine Antwort vom Server" };
}

/**
 * Trigger RSS job import from Stellenmarkt.de.
 * Admin-only operation.
 */
export async function triggerRssImport(): Promise<{
  success: boolean;
  runId?: string;
  totalFeedItems?: number;
  matchingItems?: number;
  imported?: number;
  updated?: number;
  skipped?: number;
  expired?: number;
  errors?: number;
  errorMessages?: string[];
  error?: string;
}> {
  await ensureFreshSession();

  const result = await invokeEdgeFunction<{
    success: boolean;
    runId?: string;
    totalFeedItems?: number;
    matchingItems?: number;
    imported?: number;
    updated?: number;
    skipped?: number;
    expired?: number;
    errors?: number;
    errorMessages?: string[];
  }>("import-rss-jobs", {});

  if (result.error) {
    return { success: false, error: result.error };
  }

  return result.data ?? { success: false, error: "Keine Antwort vom Server" };
}

/**
 * Check all published job URLs for dead links.
 */
export async function checkStaleJobs(): Promise<{
  success: boolean;
  error?: string;
  checked?: number;
  active?: number;
  stale?: number;
  errors?: number;
  unknown?: number;
  staleJobs?: Array<{ id: string; url: string; httpStatus?: number }>;
}> {
  await ensureFreshSession();

  const result = await invokeEdgeFunction<{
    success: boolean;
    error?: string;
    checked?: number;
    active?: number;
    stale?: number;
    errors?: number;
    unknown?: number;
    staleJobs?: Array<{ id: string; url: string; httpStatus?: number }>;
  }>("check-stale-jobs", {});

  if (result.error) {
    return { success: false, error: result.error };
  }

  return result.data ?? { success: false, error: "Keine Antwort vom Server" };
}
