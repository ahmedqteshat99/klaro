import type { Json } from "@/integrations/supabase/types";
import { canTrackAttribution } from "@/lib/cookie-consent";

const ATTRIBUTION_STORAGE_KEY = "klaro_attribution_v1";

interface AttributionTouchpoint {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
  landing_path: string;
  referrer?: string | null;
  captured_at: string;
}

interface ApplyIntent {
  job_id?: string;
  job_title?: string;
  job_path?: string;
  source?: string;
  captured_at: string;
}

interface CtaIntent {
  source?: string;
  destination?: string;
  experiment_id?: string;
  variant?: string;
  captured_at: string;
}

interface AttributionState {
  first_touch?: AttributionTouchpoint;
  last_touch?: AttributionTouchpoint;
  pending_apply?: ApplyIntent;
  pending_cta?: CtaIntent;
  experiments?: Record<string, string>;
}

const limit = (value: string | null | undefined, max = 200) => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
};

// In-memory cache to avoid repeated localStorage reads
let attributionCache: AttributionState | null = null;

const readAttributionState = (): AttributionState => {
  // Return cached value if available
  if (attributionCache !== null) {
    return attributionCache;
  }

  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) {
      attributionCache = {};
      return {};
    }
    const parsed = JSON.parse(raw) as AttributionState;
    if (!parsed || typeof parsed !== "object") {
      attributionCache = {};
      return {};
    }
    // Cache the parsed result
    attributionCache = parsed;
    return parsed;
  } catch {
    attributionCache = {};
    return {};
  }
};

const writeAttributionState = (state: AttributionState) => {
  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(state));
    // Invalidate cache to force re-read on next access
    attributionCache = null;
  } catch {
    // Best-effort only.
  }
};

const parseSourceFromReferrer = (value: string | null): string => {
  if (!value) return "direct";
  try {
    const url = new URL(value);
    return limit(url.hostname, 120) || "referral";
  } catch {
    return "referral";
  }
};

const parseTouchpoint = (pathname: string, search: string): AttributionTouchpoint => {
  const params = new URLSearchParams(search);
  const referrer = limit(document.referrer, 500);
  const source =
    limit(params.get("utm_source"), 120) || parseSourceFromReferrer(referrer);

  return {
    source,
    medium: limit(params.get("utm_medium"), 120),
    campaign: limit(params.get("utm_campaign"), 180),
    term: limit(params.get("utm_term"), 180),
    content: limit(params.get("utm_content"), 180),
    gclid: limit(params.get("gclid"), 180),
    fbclid: limit(params.get("fbclid"), 180),
    msclkid: limit(params.get("msclkid"), 180),
    landing_path: limit(`${pathname}${search}`, 600) || pathname,
    referrer,
    captured_at: new Date().toISOString(),
  };
};

const hasCampaignParams = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "msclkid",
  ].some((key) => {
    const value = params.get(key);
    return Boolean(value && value.trim().length > 0);
  });
};

export const captureAttributionFromLocation = (pathname: string, search: string) => {
  // Check for cookie consent before tracking attribution
  if (!canTrackAttribution()) {
    return;
  }

  const state = readAttributionState();
  const touchpoint = parseTouchpoint(pathname, search);
  const campaignPresent = hasCampaignParams(search);

  if (!state.first_touch) {
    state.first_touch = touchpoint;
    state.last_touch = touchpoint;
    writeAttributionState(state);
    return;
  }

  if (campaignPresent || !state.last_touch) {
    state.last_touch = touchpoint;
    writeAttributionState(state);
  }
};

export const rememberApplyIntent = (payload: {
  jobId?: string | null;
  jobTitle?: string | null;
  jobPath?: string | null;
  source?: string | null;
}) => {
  const state = readAttributionState();
  state.pending_apply = {
    job_id: limit(payload.jobId, 80) ?? undefined,
    job_title: limit(payload.jobTitle, 220) ?? undefined,
    job_path: limit(payload.jobPath, 600) ?? undefined,
    source: limit(payload.source, 80) ?? undefined,
    captured_at: new Date().toISOString(),
  };
  writeAttributionState(state);
};

export const clearApplyIntent = () => {
  const state = readAttributionState();
  if (!state.pending_apply) return;
  delete state.pending_apply;
  writeAttributionState(state);
};

export const rememberCtaClick = (payload: {
  source?: string | null;
  destination?: string | null;
  experimentId?: string | null;
  variant?: string | null;
}) => {
  const state = readAttributionState();
  state.pending_cta = {
    source: limit(payload.source, 80) ?? undefined,
    destination: limit(payload.destination, 320) ?? undefined,
    experiment_id: limit(payload.experimentId, 120) ?? undefined,
    variant: limit(payload.variant, 80) ?? undefined,
    captured_at: new Date().toISOString(),
  };
  writeAttributionState(state);
};

export const clearPendingCtaClick = () => {
  const state = readAttributionState();
  if (!state.pending_cta) return;
  delete state.pending_cta;
  writeAttributionState(state);
};

export const rememberExperimentAssignment = (
  experimentId: string,
  variant: string
) => {
  const state = readAttributionState();
  state.experiments = state.experiments ?? {};
  state.experiments[experimentId] = variant;
  writeAttributionState(state);
};

export const getRememberedExperimentVariant = (
  experimentId: string
): string | null => {
  const state = readAttributionState();
  const variant = state.experiments?.[experimentId];
  return typeof variant === "string" && variant.trim().length > 0 ? variant : null;
};

export const getAttributionMeta = (): Json | null => {
  const state = readAttributionState();
  if (
    !state.first_touch &&
    !state.last_touch &&
    !state.pending_apply &&
    !state.pending_cta &&
    !state.experiments
  ) {
    return null;
  }
  return {
    attribution_first_touch: state.first_touch ?? null,
    attribution_last_touch: state.last_touch ?? null,
    attribution_pending_apply: state.pending_apply ?? null,
    attribution_pending_cta: state.pending_cta ?? null,
    attribution_experiments: state.experiments ?? null,
  } as Json;
};
