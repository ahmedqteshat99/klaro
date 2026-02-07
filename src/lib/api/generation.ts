import { supabase } from "@/integrations/supabase/client";
import { logSlowEndpoint } from "@/lib/app-events";
import type { Profile, WorkExperience, EducationEntry, PracticalExperience, Certification, Publication } from "@/hooks/useProfile";

/**
 * Ensure a valid (non-expired) user session exists before calling an edge function.
 * If the access token is expired or expiring within 30 s, forces a refresh.
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

  if (expiresAt && expiresAt - now < 30) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error("Sitzung abgelaufen. Bitte melden Sie sich erneut an.");
    }
  }
}

/** Extract server error message from Edge Function invoke error (4xx/5xx response body). */
function getInvokeErrorMessage(error: unknown): string {
  const err = error as { context?: { body?: string }; message?: string };
  const body = err?.context?.body;
  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: string };
      if (typeof parsed?.error === "string" && parsed.error.trim()) {
        return parsed.error;
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

interface JobData {
  krankenhaus: string | null;
  standort: string | null;
  fachabteilung: string | null;
  position: string | null;
  ansprechpartner: string | null;
  anforderungen: string | null;
}

interface GenerateAnschreibenParams extends GenerateCVParams {
  jobData: JobData;
}

export const generateCV = async (params: GenerateCVParams): Promise<{ success: boolean; html?: string; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.functions.invoke('generate-cv', {
    body: params
  });
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("generate-cv", durationMs, { ok: !error });
  }

  if (error) {
    console.error('Generate CV error:', error);
    return { success: false, error: getInvokeErrorMessage(error) };
  }

  return data;
};

export const extractJobData = async (
  params: { url?: string; rawText?: string }
): Promise<{ success: boolean; data?: JobData; rawContent?: string; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.functions.invoke('extract-job', {
    body: params
  });
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("extract-job", durationMs, { ok: !error });
  }

  if (error) {
    console.error('Extract job error:', error);
    return { success: false, error: getInvokeErrorMessage(error) };
  }

  return data;
};

export const generateAnschreiben = async (params: GenerateAnschreibenParams): Promise<{ success: boolean; html?: string; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.functions.invoke('generate-anschreiben', {
    body: params
  });
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("generate-anschreiben", durationMs, { ok: !error });
  }

  if (error) {
    console.error('Generate Anschreiben error:', error);
    return { success: false, error: getInvokeErrorMessage(error) };
  }

  return data;
};

export const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
  await ensureFreshSession();
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.functions.invoke('delete-account');
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("delete-account", durationMs, { ok: !error });
  }

  if (error) {
    console.error('Delete account error:', error);
    return { success: false, error: getInvokeErrorMessage(error) };
  }

  return data;
};
