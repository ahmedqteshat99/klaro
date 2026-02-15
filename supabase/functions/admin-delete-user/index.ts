import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = (req: Request) => {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = !origin
    ? "*"
    : allowedOrigins.length === 0 || allowedOrigins.includes(origin)
      ? origin
      : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Benutzer nicht gefunden" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || adminProfile?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const targetUserId = body?.userId as string | undefined;
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "userId fehlt" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Call the comprehensive delete_user_account function
    // This handles ALL tables including applications, messages, email_aliases, etc.
    const { data: deletionSummary, error: deleteFuncError } = await supabaseAdmin
      .rpc("delete_user_account", { p_user_id: targetUserId });

    if (deleteFuncError) {
      console.error("Error calling delete_user_account:", deleteFuncError);
      throw new Error(`Fehler beim Löschen der Benutzerdaten: ${deleteFuncError.message}`);
    }

    console.log("Deletion summary:", deletionSummary);

    // Delete storage files
    const { data: files } = await supabaseAdmin.storage
      .from("user-files")
      .list(targetUserId);

    if (files && files.length > 0) {
      const filePaths = files.map((file) => `${targetUserId}/${file.name}`);
      const { error: storageError } = await supabaseAdmin.storage
        .from("user-files")
        .remove(filePaths);

      if (storageError) {
        console.error("Error deleting storage files:", storageError);
        // Continue anyway - don't fail the whole operation
      }
    }

    // Log deletion for audit trail
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    const userEmail = userData?.user?.email || "unknown";

    await supabaseAdmin
      .from("account_deletion_log")
      .insert({
        user_id: targetUserId,
        user_email: userEmail,
        deletion_summary: deletionSummary,
        deleted_by: user.id,
      })
      .select()
      .single();

    // Finally, delete the auth user (trigger will run but data already deleted)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      throw new Error(`Benutzerkonto konnte nicht gelöscht werden: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
