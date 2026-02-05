import { supabase } from "@/integrations/supabase/client";
import { logSlowEndpoint } from "@/lib/app-events";
import type { Profile, WorkExperience, EducationEntry, PracticalExperience, Certification, Publication } from "@/hooks/useProfile";

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
    return { success: false, error: error.message };
  }

  return data;
};

export const extractJobData = async (
  params: { url?: string; rawText?: string }
): Promise<{ success: boolean; data?: JobData; rawContent?: string; error?: string }> => {
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
    return { success: false, error: error.message };
  }

  return data;
};

export const generateAnschreiben = async (params: GenerateAnschreibenParams): Promise<{ success: boolean; html?: string; error?: string }> => {
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
    return { success: false, error: error.message };
  }

  return data;
};

export const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { data, error } = await supabase.functions.invoke('delete-account');
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
  if (durationMs > 1500) {
    void logSlowEndpoint("delete-account", durationMs, { ok: !error });
  }

  if (error) {
    console.error('Delete account error:', error);
    return { success: false, error: error.message };
  }

  return data;
};
