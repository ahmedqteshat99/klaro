import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { CustomSection, CustomSectionEntry } from "@/lib/types/cv-review";

export type Profile = Tables<"profiles">;
export type WorkExperience = Tables<"work_experiences">;
export type EducationEntry = Tables<"education_entries">;
export type PracticalExperience = Tables<"practical_experiences">;
export type Certification = Tables<"certifications">;
export type Publication = Tables<"publications">;
export type { CustomSection, CustomSectionEntry };

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [practicalExperiences, setPracticalExperiences] = useState<PracticalExperience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customSectionEntries, setCustomSectionEntries] = useState<CustomSectionEntry[]>([]);
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
        pubRes,
        customSectionsRes,
        customEntriesRes
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", uid).single(),
        supabase.from("work_experiences").select("*").eq("user_id", uid).order("zeitraum_von", { ascending: false }),
        supabase.from("education_entries").select("*").eq("user_id", uid).order("zeitraum_von", { ascending: false }),
        supabase.from("practical_experiences").select("*").eq("user_id", uid).order("zeitraum_von", { ascending: false }),
        supabase.from("certifications").select("*").eq("user_id", uid).order("datum", { ascending: false }),
        supabase.from("publications").select("*").eq("user_id", uid).order("datum", { ascending: false }),
        supabase.from("custom_sections").select("*").eq("user_id", uid).order("section_order", { ascending: true }),
        supabase.from("custom_section_entries").select("*").eq("user_id", uid).order("created_at", { ascending: false })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (workRes.data) setWorkExperiences(workRes.data);
      if (eduRes.data) setEducationEntries(eduRes.data);
      if (practicalRes.data) setPracticalExperiences(practicalRes.data);
      if (certRes.data) setCertifications(certRes.data);
      if (pubRes.data) setPublications(pubRes.data);
      if (customSectionsRes.data) setCustomSections(customSectionsRes.data as CustomSection[]);
      if (customEntriesRes.data) setCustomSectionEntries(customEntriesRes.data as CustomSectionEntry[]);
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

  // Bulk add practical experiences locally (for CV import)
  const addPracticalExperiencesLocal = (
    entries: Omit<PracticalExperience, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => {
    const newEntries = entries.map((entry, index) => ({
      ...entry,
      id: `temp-practical-${Date.now()}-${index}`,
      user_id: userId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as PracticalExperience[];
    setPracticalExperiences((prev) => [...newEntries, ...prev]);
  };

  // Bulk add publications locally (for CV import)
  const addPublicationsLocal = (
    entries: Omit<Publication, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => {
    const newEntries = entries.map((entry, index) => ({
      ...entry,
      id: `temp-publication-${Date.now()}-${index}`,
      user_id: userId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as Publication[];
    setPublications((prev) => [...newEntries, ...prev]);
  };

  // Custom Section CRUD
  const addCustomSection = async (sectionName: string): Promise<CustomSection | null> => {
    if (!userId) return null;
    try {
      const maxOrder = customSections.reduce((max, s) => Math.max(max, s.section_order), -1);
      const { data: newSection, error } = await supabase
        .from("custom_sections")
        .insert({
          section_name: sectionName,
          user_id: userId,
          section_order: maxOrder + 1
        })
        .select()
        .single();
      if (error) throw error;
      const section = newSection as CustomSection;
      setCustomSections([...customSections, section]);
      toast({ title: "Hinzugefügt", description: `Sektion "${sectionName}" wurde erstellt.` });
      return section;
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const updateCustomSection = async (id: string, data: { section_name?: string; section_order?: number }) => {
    try {
      const { error } = await supabase.from("custom_sections").update(data).eq("id", id);
      if (error) throw error;
      setCustomSections(customSections.map(s => s.id === id ? { ...s, ...data } as CustomSection : s));
      toast({ title: "Gespeichert", description: "Sektion wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deleteCustomSection = async (id: string) => {
    try {
      const { error } = await supabase.from("custom_sections").delete().eq("id", id);
      if (error) throw error;
      setCustomSections(customSections.filter(s => s.id !== id));
      setCustomSectionEntries(customSectionEntries.filter(e => e.section_id !== id));
      toast({ title: "Gelöscht", description: "Sektion wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Custom Section Entry CRUD
  const addCustomSectionEntry = async (
    sectionId: string,
    data: Omit<CustomSectionEntry, "id" | "section_id" | "user_id" | "created_at" | "updated_at">
  ) => {
    if (!userId) return;
    try {
      const { data: newEntry, error } = await supabase
        .from("custom_section_entries")
        .insert({ ...data, section_id: sectionId, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setCustomSectionEntries([newEntry as CustomSectionEntry, ...customSectionEntries]);
      toast({ title: "Hinzugefügt", description: "Eintrag wurde hinzugefügt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const updateCustomSectionEntry = async (
    id: string,
    data: Partial<Omit<CustomSectionEntry, "id" | "section_id" | "user_id" | "created_at" | "updated_at">>
  ) => {
    try {
      const { error } = await supabase.from("custom_section_entries").update(data).eq("id", id);
      if (error) throw error;
      setCustomSectionEntries(customSectionEntries.map(e => e.id === id ? { ...e, ...data } as CustomSectionEntry : e));
      toast({ title: "Gespeichert", description: "Eintrag wurde aktualisiert." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const deleteCustomSectionEntry = async (id: string) => {
    try {
      const { error } = await supabase.from("custom_section_entries").delete().eq("id", id);
      if (error) throw error;
      setCustomSectionEntries(customSectionEntries.filter(e => e.id !== id));
      toast({ title: "Gelöscht", description: "Eintrag wurde entfernt." });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // Get entries for a specific section
  const getEntriesForSection = (sectionId: string) => {
    return customSectionEntries.filter(e => e.section_id === sectionId);
  };

  return {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    customSections,
    customSectionEntries,
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
    addPracticalExperiencesLocal,
    addCertification,
    updateCertification,
    deleteCertification,
    addCertificationsLocal,
    addPublication,
    updatePublication,
    deletePublication,
    addPublicationsLocal,
    addCustomSection,
    updateCustomSection,
    deleteCustomSection,
    addCustomSectionEntry,
    updateCustomSectionEntry,
    deleteCustomSectionEntry,
    getEntriesForSection,
    refetch: () => userId && fetchAllData(userId)
  };
};
