import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type WorkExperience = Tables<"work_experiences">;
export type EducationEntry = Tables<"education_entries">;
export type PracticalExperience = Tables<"practical_experiences">;
export type Certification = Tables<"certifications">;
export type Publication = Tables<"publications">;

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [practicalExperiences, setPracticalExperiences] = useState<PracticalExperience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUserId(user.id);
      await fetchAllData(user.id);
    };

    fetchUserAndProfile();
  }, []);

  const fetchAllData = async (uid: string) => {
    setIsLoading(true);
    try {
      const [
        profileRes,
        workRes,
        eduRes,
        practicalRes,
        certRes,
        pubRes
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", uid).single(),
        supabase.from("work_experiences").select("*").eq("user_id", uid).order("zeitraum_von", { ascending: false }),
        supabase.from("education_entries").select("*").eq("user_id", uid).order("zeitraum_von", { ascending: false }),
        supabase.from("practical_experiences").select("*").eq("user_id", uid).order("zeitraum_von", { ascending: false }),
        supabase.from("certifications").select("*").eq("user_id", uid).order("datum", { ascending: false }),
        supabase.from("publications").select("*").eq("user_id", uid).order("datum", { ascending: false })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (workRes.data) setWorkExperiences(workRes.data);
      if (eduRes.data) setEducationEntries(eduRes.data);
      if (practicalRes.data) setPracticalExperiences(practicalRes.data);
      if (certRes.data) setCertifications(certRes.data);
      if (pubRes.data) setPublications(pubRes.data);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Profile CRUD
  const saveProfile = async (data: Partial<Profile>) => {
    if (!userId) return;
    
    try {
      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update(data as TablesUpdate<"profiles">)
          .eq("id", profile.id);
        if (error) throw error;
        setProfile({ ...profile, ...data } as Profile);
      } else {
        const insertData: TablesInsert<"profiles"> = {
          user_id: userId,
          vorname: data.vorname || "",
          nachname: data.nachname || "",
          ...data
        };
        const { data: newProfile, error } = await supabase
          .from("profiles")
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        setProfile(newProfile);
      }
      toast({ title: "Gespeichert", description: "Profil wurde aktualisiert." });
    } catch (error: any) {
      toast({ 
        title: "Fehler", 
        description: error.message || "Speichern fehlgeschlagen.", 
        variant: "destructive" 
      });
    }
  };

  // Work Experience CRUD
  const addWorkExperience = async (data: Omit<TablesInsert<"work_experiences">, "user_id">) => {
    if (!userId) return;
    try {
      const { data: newEntry, error } = await supabase
        .from("work_experiences")
        .insert({ ...data, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setWorkExperiences([newEntry, ...workExperiences]);
      toast({ title: "Hinzugefügt", description: "Berufserfahrung wurde hinzugefügt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updateWorkExperience = async (id: string, data: TablesUpdate<"work_experiences">) => {
    try {
      const { error } = await supabase.from("work_experiences").update(data).eq("id", id);
      if (error) throw error;
      setWorkExperiences(workExperiences.map(w => w.id === id ? { ...w, ...data } : w));
      toast({ title: "Gespeichert", description: "Berufserfahrung wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deleteWorkExperience = async (id: string) => {
    try {
      const { error } = await supabase.from("work_experiences").delete().eq("id", id);
      if (error) throw error;
      setWorkExperiences(workExperiences.filter(w => w.id !== id));
      toast({ title: "Gelöscht", description: "Berufserfahrung wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Education CRUD
  const addEducation = async (data: Omit<TablesInsert<"education_entries">, "user_id">) => {
    if (!userId) return;
    try {
      const { data: newEntry, error } = await supabase
        .from("education_entries")
        .insert({ ...data, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setEducationEntries([newEntry, ...educationEntries]);
      toast({ title: "Hinzugefügt", description: "Ausbildung wurde hinzugefügt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updateEducation = async (id: string, data: TablesUpdate<"education_entries">) => {
    try {
      const { error } = await supabase.from("education_entries").update(data).eq("id", id);
      if (error) throw error;
      setEducationEntries(educationEntries.map(e => e.id === id ? { ...e, ...data } : e));
      toast({ title: "Gespeichert", description: "Ausbildung wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deleteEducation = async (id: string) => {
    try {
      const { error } = await supabase.from("education_entries").delete().eq("id", id);
      if (error) throw error;
      setEducationEntries(educationEntries.filter(e => e.id !== id));
      toast({ title: "Gelöscht", description: "Ausbildung wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Practical Experience CRUD
  const addPracticalExperience = async (data: Omit<TablesInsert<"practical_experiences">, "user_id">) => {
    if (!userId) return;
    try {
      const { data: newEntry, error } = await supabase
        .from("practical_experiences")
        .insert({ ...data, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setPracticalExperiences([newEntry, ...practicalExperiences]);
      toast({ title: "Hinzugefügt", description: "Praktische Erfahrung wurde hinzugefügt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updatePracticalExperience = async (id: string, data: TablesUpdate<"practical_experiences">) => {
    try {
      const { error } = await supabase.from("practical_experiences").update(data).eq("id", id);
      if (error) throw error;
      setPracticalExperiences(practicalExperiences.map(p => p.id === id ? { ...p, ...data } : p));
      toast({ title: "Gespeichert", description: "Praktische Erfahrung wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deletePracticalExperience = async (id: string) => {
    try {
      const { error } = await supabase.from("practical_experiences").delete().eq("id", id);
      if (error) throw error;
      setPracticalExperiences(practicalExperiences.filter(p => p.id !== id));
      toast({ title: "Gelöscht", description: "Praktische Erfahrung wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Certification CRUD
  const addCertification = async (data: Omit<TablesInsert<"certifications">, "user_id">) => {
    if (!userId) return;
    try {
      const { data: newEntry, error } = await supabase
        .from("certifications")
        .insert({ ...data, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setCertifications([newEntry, ...certifications]);
      toast({ title: "Hinzugefügt", description: "Zertifikat wurde hinzugefügt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updateCertification = async (id: string, data: TablesUpdate<"certifications">) => {
    try {
      const { error } = await supabase.from("certifications").update(data).eq("id", id);
      if (error) throw error;
      setCertifications(certifications.map(c => c.id === id ? { ...c, ...data } : c));
      toast({ title: "Gespeichert", description: "Zertifikat wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deleteCertification = async (id: string) => {
    try {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw error;
      setCertifications(certifications.filter(c => c.id !== id));
      toast({ title: "Gelöscht", description: "Zertifikat wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Publication CRUD
  const addPublication = async (data: Omit<TablesInsert<"publications">, "user_id">) => {
    if (!userId) return;
    try {
      const { data: newEntry, error } = await supabase
        .from("publications")
        .insert({ ...data, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setPublications([newEntry, ...publications]);
      toast({ title: "Hinzugefügt", description: "Publikation wurde hinzugefügt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updatePublication = async (id: string, data: TablesUpdate<"publications">) => {
    try {
      const { error } = await supabase.from("publications").update(data).eq("id", id);
      if (error) throw error;
      setPublications(publications.map(p => p.id === id ? { ...p, ...data } : p));
      toast({ title: "Gespeichert", description: "Publikation wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deletePublication = async (id: string) => {
    try {
      const { error } = await supabase.from("publications").delete().eq("id", id);
      if (error) throw error;
      setPublications(publications.filter(p => p.id !== id));
      toast({ title: "Gelöscht", description: "Publikation wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Update local profile state without saving to DB (for CV import)
  const updateLocalProfile = (data: Partial<Profile>) => {
    setProfile((prev) => prev ? { ...prev, ...data } : null);
  };

  // Bulk add work experiences locally (for CV import)
  const addWorkExperiencesLocal = (entries: Omit<WorkExperience, "id" | "user_id" | "created_at" | "updated_at">[]) => {
    const newEntries = entries.map((entry, index) => ({
      ...entry,
      id: `temp-work-${Date.now()}-${index}`,
      user_id: userId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as WorkExperience[];
    setWorkExperiences((prev) => [...newEntries, ...prev]);
  };

  // Bulk add education entries locally (for CV import)
  const addEducationEntriesLocal = (entries: Omit<EducationEntry, "id" | "user_id" | "created_at" | "updated_at">[]) => {
    const newEntries = entries.map((entry, index) => ({
      ...entry,
      id: `temp-edu-${Date.now()}-${index}`,
      user_id: userId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as EducationEntry[];
    setEducationEntries((prev) => [...newEntries, ...prev]);
  };

  // Bulk add certifications locally (for CV import)
  const addCertificationsLocal = (entries: Omit<Certification, "id" | "user_id" | "created_at" | "updated_at">[]) => {
    const newEntries = entries.map((entry, index) => ({
      ...entry,
      id: `temp-cert-${Date.now()}-${index}`,
      user_id: userId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as Certification[];
    setCertifications((prev) => [...newEntries, ...prev]);
  };

  return {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    isLoading,
    userId,
    saveProfile,
    updateLocalProfile,
    addWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    addWorkExperiencesLocal,
    addEducation,
    updateEducation,
    deleteEducation,
    addEducationEntriesLocal,
    addPracticalExperience,
    updatePracticalExperience,
    deletePracticalExperience,
    addCertification,
    updateCertification,
    deleteCertification,
    addCertificationsLocal,
    addPublication,
    updatePublication,
    deletePublication,
    refetch: () => userId && fetchAllData(userId)
  };
};
