export const sanitizeNextPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Only allow in-app relative paths.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
};

export const withNextParam = (basePath: string, nextPath: string | null): string => {
  if (!nextPath) return basePath;
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}next=${encodeURIComponent(nextPath)}`;
};

