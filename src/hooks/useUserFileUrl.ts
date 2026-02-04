import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "user-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const resolveUserFilePath = (value?: string | null): string | null => {
  if (!value) return null;

  if (!value.startsWith("http")) {
    return value;
  }

  try {
    const url = new URL(value);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/user-files\/(.+)$/
    );
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    return null;
  }

  return null;
};

export const useUserFileUrl = (value?: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  const path = useMemo(() => resolveUserFilePath(value), [value]);

  useEffect(() => {
    let isActive = true;

    if (!value) {
      setUrl(null);
      return () => {
        isActive = false;
      };
    }

    if (!path) {
      setUrl(value);
      return () => {
        isActive = false;
      };
    }

    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) {
          console.error("Signed URL error:", error);
          setUrl(null);
          return;
        }
        setUrl(data?.signedUrl ?? null);
      });

    return () => {
      isActive = false;
    };
  }, [path, value]);

  return { url, path };
};
