export type FeatureFlag =
  | "inbox_v2_layout"
  | "inbox_v2_composer"
  | "inbox_realtime";

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  inbox_v2_layout: true,
  inbox_v2_composer: true,
  inbox_realtime: true,
};

const STORAGE_PREFIX = "ff_";

const parseBoolean = (value: string | null): boolean | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  return null;
};

const fromSearchParams = (flag: FeatureFlag): boolean | null => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return parseBoolean(params.get(flag));
};

const fromLocalStorage = (flag: FeatureFlag): boolean | null => {
  if (typeof window === "undefined") return null;
  return parseBoolean(window.localStorage.getItem(`${STORAGE_PREFIX}${flag}`));
};

const fromEnv = (flag: FeatureFlag): boolean | null => {
  const key = `VITE_FF_${flag.toUpperCase()}` as const;
  const value = (import.meta.env[key] as string | undefined) ?? null;
  return parseBoolean(value);
};

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  const searchValue = fromSearchParams(flag);
  if (searchValue !== null) return searchValue;

  const storageValue = fromLocalStorage(flag);
  if (storageValue !== null) return storageValue;

  const envValue = fromEnv(flag);
  if (envValue !== null) return envValue;

  return DEFAULT_FLAGS[flag];
};

export const setFeatureFlagOverride = (flag: FeatureFlag, enabled: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}${flag}`, enabled ? "1" : "0");
};

