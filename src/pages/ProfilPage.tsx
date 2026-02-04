import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import AppFooter from "@/components/AppFooter";

import PersonalDataForm from "@/components/profile/PersonalDataForm";
import ProfessionalProfileForm from "@/components/profile/ProfessionalProfileForm";
import WorkExperienceForm from "@/components/profile/WorkExperienceForm";
import EducationForm from "@/components/profile/EducationForm";
import PracticalExperienceForm from "@/components/profile/PracticalExperienceForm";
import SkillsForm from "@/components/profile/SkillsForm";
import LanguageSkillsForm from "@/components/profile/LanguageSkillsForm";
import CertificationsForm from "@/components/profile/CertificationsForm";
import PublicationsForm from "@/components/profile/PublicationsForm";
import PhotoUpload from "@/components/profile/PhotoUpload";
import SignatureCanvas from "@/components/profile/SignatureCanvas";

const ProfilPage = () => {
  const navigate = useNavigate();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    isLoading,
    userId,
    saveProfile,
    addWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    addPracticalExperience,
    updatePracticalExperience,
    deletePracticalExperience,
    addCertification,
    updateCertification,
    deleteCertification,
    addPublication,
    updatePublication,
    deletePublication
  } = useProfile();


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lädt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <BrandLogo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-24 pb-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
            Mein Profil
          </h1>
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
            {/* Left Column - Photo & Signature */}
            <div className="lg:col-span-1 space-y-6">
              <PhotoUpload
                profile={profile}
                userId={userId}
                onSave={saveProfile}
              />
              <SignatureCanvas
                profile={profile}
                userId={userId}
                onSave={saveProfile}
              />
            </div>

            {/* Right Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              <PersonalDataForm
                profile={profile}
                onSave={saveProfile}
                isLoading={isLoading}
              />

              <ProfessionalProfileForm
                profile={profile}
                onSave={saveProfile}
                isLoading={isLoading}
              />

              <WorkExperienceForm
                workExperiences={workExperiences}
                onAdd={addWorkExperience}
                onUpdate={updateWorkExperience}
                onDelete={deleteWorkExperience}
              />

              <EducationForm
                educationEntries={educationEntries}
                onAdd={addEducation}
                onUpdate={updateEducation}
                onDelete={deleteEducation}
              />

              <PracticalExperienceForm
                practicalExperiences={practicalExperiences}
                onAdd={addPracticalExperience}
                onUpdate={updatePracticalExperience}
                onDelete={deletePracticalExperience}
              />

              <SkillsForm
                profile={profile}
                onSave={saveProfile}
                isLoading={isLoading}
              />

              <LanguageSkillsForm
                profile={profile}
                onSave={saveProfile}
                isLoading={isLoading}
              />

              <CertificationsForm
                certifications={certifications}
                onAdd={addCertification}
                onUpdate={updateCertification}
                onDelete={deleteCertification}
              />

              <PublicationsForm
                publications={publications}
                onAdd={addPublication}
                onUpdate={updatePublication}
                onDelete={deletePublication}
              />

            </div>
          </div>
        </ScrollArea>
        <AppFooter />
      </div>
    </div>
  );
};

export default ProfilPage;
