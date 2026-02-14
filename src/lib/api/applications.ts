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

  if (expiresAt && expiresAt - now < 60) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error("Sitzung abgelaufen. Bitte neu anmelden.");
    }
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

export async function mergeApplicationPdfs(payload: MergeApplicationPdfsPayload): Promise<{
  success: boolean;
  blob?: Blob;
  filename?: string;
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

  const { data, error } = await supabase.functions.invoke("merge-application-pdfs", {
    body: payload,
    responseType: "blob",
  });

  if (error) {
    return { success: false, error: parseFunctionError(error) };
  }

  if (!data || !(data instanceof Blob)) {
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
    blob: data,
    filename,
  };
}
