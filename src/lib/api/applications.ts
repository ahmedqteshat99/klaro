import { supabase } from "@/integrations/supabase/client";

interface SendApplicationEmailPayload {
  applicationId: string;
  subject?: string;
  text?: string;
  html?: string;
}

interface ReplyApplicationEmailPayload {
  attachments?: Array<{
    filePath: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  }>;
  applicationId: string;
  subject?: string;
  text: string;
  html?: string;
  recipient?: string;
  inReplyToMessageId?: string;
}

const parseFunctionError = (error: unknown): string => {
  const body = (error as { context?: { body?: string } })?.context?.body;
  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string };
      if (parsed.error) return parsed.error;
      if (parsed.message) return parsed.message;
    } catch {
      // ignore parse failure
    }
  }
  return (error as { message?: string })?.message || "Versand fehlgeschlagen";
};

async function ensureFreshSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Nicht angemeldet. Bitte neu anmelden.");
  }

  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);

  // Refresh if session expires in less than 5 minutes (increased buffer)
  if (expiresAt && expiresAt - now < 300) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error("Sitzung abgelaufen. Bitte neu anmelden.");
    }

    // Verify the new session is valid
    if (!data.session) {
      throw new Error("Sitzung konnte nicht erneuert werden. Bitte neu anmelden.");
    }

    // Wait a moment for the new token to propagate
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function sendApplicationEmail(payload: SendApplicationEmailPayload): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    await ensureFreshSession();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nicht angemeldet.",
    };
  }

  const { data, error } = await supabase.functions.invoke("send-application-email", {
    body: payload,
  });

  if (error) {
    const message = parseFunctionError(error);
    return { success: false, error: message };
  }

  return {
    success: Boolean(data?.success ?? true),
    message: data?.message,
    error: data?.error,
  };
}

export async function replyApplicationEmail(payload: ReplyApplicationEmailPayload): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    await ensureFreshSession();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nicht angemeldet.",
    };
  }

  const { data, error } = await supabase.functions.invoke("reply-application-email", {
    body: payload,
  });

  if (error) {
    return { success: false, error: parseFunctionError(error) };
  }

  return {
    success: Boolean(data?.success ?? true),
    message: data?.message,
    error: data?.error,
  };
}

interface MergeApplicationPdfsPayload {
  applicationId: string;
  hospitalName?: string;
  nachname?: string;
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    // Try refreshing once
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (!refreshData.session?.access_token) {
      throw new Error("Nicht angemeldet. Bitte laden Sie die Seite neu und melden Sie sich erneut an.");
    }
    return refreshData.session.access_token;
  }

  // Proactively refresh if expiring within 5 minutes
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt - now < 300) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData.session?.access_token) {
      return refreshData.session.access_token;
    }
  }

  return session.access_token;
}

export async function mergeApplicationPdfs(payload: MergeApplicationPdfsPayload): Promise<{
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nicht angemeldet.",
    };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const functionUrl = `${supabaseUrl}/functions/v1/merge-application-pdfs`;

  const doFetch = async (token: string): Promise<Response> => {
    return fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": anonKey,
      },
      body: JSON.stringify(payload),
    });
  };

  let response = await doFetch(accessToken);

  // If 401, refresh token and retry once
  if (response.status === 401) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData.session?.access_token) {
        response = await doFetch(refreshData.session.access_token);
      }
    } catch {
      // refresh failed
    }

    if (response.status === 401) {
      return {
        success: false,
        error: "Ihre Sitzung ist abgelaufen. Bitte laden Sie die Seite neu und melden Sie sich erneut an.",
      };
    }
  }

  // Handle non-2xx responses (read as JSON for error message)
  if (!response.ok) {
    try {
      const errorBody = await response.json() as { error?: string; message?: string; details?: unknown };
      return {
        success: false,
        error: errorBody.error || errorBody.message || `Fehler ${response.status}`,
      };
    } catch {
      return { success: false, error: `Server-Fehler (${response.status})` };
    }
  }

  // Success: read response as blob
  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    return { success: false, error: "Keine PDF-Daten empfangen" };
  }

  // Generate filename
  const filenameParts = [];
  if (payload.nachname) filenameParts.push(payload.nachname);
  if (payload.hospitalName) filenameParts.push(payload.hospitalName);

  const filename = filenameParts.length > 0
    ? `${filenameParts.join('_')}.pdf`
    : `Bewerbung_${payload.applicationId.slice(0, 8)}.pdf`;

  return {
    success: true,
    blob,
    filename,
  };
}
