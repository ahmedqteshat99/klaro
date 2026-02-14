import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getAttributionMeta } from "@/lib/attribution";

export type AppEventType =
  | "signup"
  | "login"
  | "generate"
  | "export"
  | "slow_endpoint"
  | "dashboard_hub_view"
  | "dashboard_circle_click"
  | "dashboard_progress_snapshot"
  | "onboarding_complete"
  | "funnel_apply_click"
  | "funnel_prepare_start"
  | "funnel_prepare_success"
  | "funnel_prepare_failed"
  | "funnel_send_success"
  | "funnel_send_failed"
  | "funnel_reply_success"
  | "funnel_reply_failed"
  | "inbox_thread_open"
  | "inbox_follow_up_prefill"
  | "inbox_mark_done"
  | "inbox_mark_reopen"
  | "inbox_reply_send_attempt"
  | "inbox_reply_draft_saved"
  | "inbox_realtime_event";

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

const mergeMetaWithAttribution = (meta?: Json): Json | undefined => {
  const attribution = getAttributionMeta();
  if (!attribution) return meta;
  if (!meta) return attribution;

  if (
    typeof attribution === "object" &&
    attribution !== null &&
    !Array.isArray(attribution) &&
    typeof meta === "object" &&
    meta !== null &&
    !Array.isArray(meta)
  ) {
    return {
      ...attribution,
      ...meta,
    } as Json;
  }

  return {
    attribution,
    meta,
  } as Json;
};

export const logFunnelEvent = async (
  type: Extract<
    AppEventType,
    | "onboarding_complete"
    | "funnel_apply_click"
    | "funnel_prepare_start"
    | "funnel_prepare_success"
    | "funnel_prepare_failed"
    | "funnel_send_success"
    | "funnel_send_failed"
    | "funnel_reply_success"
    | "funnel_reply_failed"
  >,
  meta?: Json,
  userId?: string | null
) => {
  return logEvent(type, mergeMetaWithAttribution(meta), userId);
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
