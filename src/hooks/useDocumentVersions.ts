import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SaveDocumentParams {
  userId: string;
  typ: "CV" | "Anschreiben";
  htmlContent: string;
  name?: string;
  hospitalName?: string | null;
  departmentOrSpecialty?: string | null;
  positionTitle?: string | null;
  jobUrl?: string | null;
  inputSnapshot?: Record<string, unknown>;
  showFoto?: boolean;
  showSignatur?: boolean;
}

interface DocumentVersion {
  id: string;
  html_content: string;
  created_at: string;
}

export const useDocumentVersions = () => {
  const { toast } = useToast();

  const getNextVersionName = async (userId: string, typ: "CV" | "Anschreiben", hospitalName?: string | null): Promise<string> => {
    const { count, error } = await supabase
      .from("document_versions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("typ", typ);

    if (error) {
      console.error("Error counting documents:", error);
      return typ === "CV" ? "Lebenslauf v1" : "Anschreiben v1";
    }

    const version = (count || 0) + 1;
    if (typ === "Anschreiben" && hospitalName) {
      return `${hospitalName} – Anschreiben v${version}`;
    }
    return typ === "CV" ? `Lebenslauf v${version}` : `Anschreiben v${version}`;
  };

  const getLatestDocument = async (userId: string, typ: "CV" | "Anschreiben"): Promise<DocumentVersion | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from("document_versions") as any)
        .select("id, html_content, created_at")
        .eq("user_id", userId)
        .eq("typ", typ)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching latest document:", error);
        return null;
      }

      // maybeSingle returns null if no rows found, which is fine
      return data as DocumentVersion | null;
    } catch (error) {
      console.error("Error in getLatestDocument:", error);
      return null;
    }
  };


  const saveDocument = async ({
    userId,
    typ,
    htmlContent,
    name,
    hospitalName,
    departmentOrSpecialty,
    positionTitle,
    jobUrl,
    inputSnapshot,
    showFoto = true,
    showSignatur = true
  }: SaveDocumentParams): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const docName = name || await getNextVersionName(userId, typ, hospitalName);

      const insertData = {
        user_id: userId,
        typ,
        name: docName,
        html_content: htmlContent,
        hospital_name: hospitalName || null,
        department_or_specialty: departmentOrSpecialty || null,
        position_title: positionTitle || null,
        job_url: jobUrl || null,
        input_snapshot: inputSnapshot as Record<string, unknown> | null,
        show_foto: showFoto,
        show_signatur: showSignatur,
        applied: false
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from("document_versions") as any)
        .insert(insertData)
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "Gespeichert ✅",
        description: `${docName} wurde automatisch gespeichert.`
      });

      return { success: true, id: data.id };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen.";
      console.error("Save document error:", error);
      toast({
        title: "Fehler beim Speichern",
        description: message,
        variant: "destructive"
      });
      return { success: false, error: message };
    }
  };

  return { saveDocument, getNextVersionName, getLatestDocument };
};
