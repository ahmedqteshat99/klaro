import { supabase } from "@/integrations/supabase/client";

export interface CvImportProfile {
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  telefon?: string | null;
  stadt?: string | null;
  geburtsdatum?: string | null;
  staatsangehoerigkeit?: string | null;
  familienstand?: string | null;
  fachrichtung?: string | null;
  approbationsstatus?: string | null;
  deutschniveau?: string | null;
  berufserfahrung_jahre?: number | null;
  medizinische_kenntnisse?: string[] | null;
  edv_kenntnisse?: string[] | null;
  sprachkenntnisse?: string[] | null;
  interessen?: string | null;
  cv_text?: string | null;
}

export interface CvImportWorkExperience {
  klinik: string;
  station?: string | null;
  taetigkeiten?: string | null;
  zeitraum_von?: string | null;
  zeitraum_bis?: string | null;
}

export interface CvImportEducationEntry {
  universitaet: string;
  abschluss?: string | null;
  abschlussarbeit?: string | null;
  zeitraum_von?: string | null;
  zeitraum_bis?: string | null;
}

export interface CvImportPracticalExperience {
  einrichtung: string;
  fachbereich?: string | null;
  beschreibung?: string | null;
  typ?: string | null;
  zeitraum_von?: string | null;
  zeitraum_bis?: string | null;
}

export interface CvImportCertification {
  name: string;
  aussteller?: string | null;
  datum?: string | null;
}

export interface CvImportPublication {
  titel: string;
  typ?: string | null;
  journal_ort?: string | null;
  datum?: string | null;
  beschreibung?: string | null;
}

export interface CvImportData {
  profile?: CvImportProfile | null;
  workExperiences?: CvImportWorkExperience[] | null;
  educationEntries?: CvImportEducationEntry[] | null;
  practicalExperiences?: CvImportPracticalExperience[] | null;
  certifications?: CvImportCertification[] | null;
  publications?: CvImportPublication[] | null;
  unmatchedData?: string[] | null;
}

export const parseCvText = async (
  text: string
): Promise<{ success: boolean; data?: CvImportData; error?: string }> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Parse CV session error:", sessionError);
  }
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return {
      success: false,
      error: "Bitte melden Sie sich erneut an, bevor Sie den CV-Import nutzen.",
    };
  }

  const { data, error, response } = await supabase.functions.invoke("parse-cv", {
    body: { text },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    let errorMessage = error.message || "Unbekannter Fehler";
    let responseStatus: number | undefined;
    let responseBody: string | undefined;

    if (response) {
      responseStatus = response.status;
      try {
        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
          const json = await response.json();
          if (json?.error) {
            errorMessage = String(json.error);
          } else if (json?.message) {
            errorMessage = String(json.message);
          } else {
            responseBody = JSON.stringify(json);
          }
        } else {
          const textBody = await response.text();
          if (textBody) {
            errorMessage = textBody;
          }
        }
      } catch (readError) {
        console.error("Parse CV error response read failed:", readError);
      }
    }

    if (responseStatus) {
      errorMessage = `${errorMessage} (HTTP ${responseStatus})`;
    }

    console.error("Parse CV error:", {
      error,
      status: responseStatus,
      body: responseBody,
    });

    return { success: false, error: errorMessage };
  }

  return data;
};
