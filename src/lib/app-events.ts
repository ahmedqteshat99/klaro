import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AppEventType =
  | "signup"
  | "login"
  | "generate"
  | "export"
  | "slow_endpoint";

export const logEvent = async (
  type: AppEventType,
  meta?: Json,
  userId?: string | null
) => {
  try {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { success: false, error: "not_authenticated" };

    const { error } = await supabase
      .from("app_events")
      .insert({ user_id: uid, type, meta: meta ?? null });

    if (error) {
      console.warn("logEvent error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.warn("logEvent error:", error);
    return { success: false, error: "unexpected_error" };
  }
};

export const logSlowEndpoint = async (
  name: string,
  durationMs: number,
  meta?: Json,
  userId?: string | null
) => {
  return logEvent(
    "slow_endpoint",
    {
      name,
      duration_ms: Math.round(durationMs),
      ...(meta ?? {})
    },
    userId
  );
};

export const touchLastSeen = async (userId?: string | null) => {
  try {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;

    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", uid);

    if (error) {
      console.warn("touchLastSeen error:", error.message);
    }
  } catch (error) {
    console.warn("touchLastSeen error:", error);
  }
};
