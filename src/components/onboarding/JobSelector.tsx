import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  title: string | null;
  hospital_name: string | null;
  department: string | null;
  location: string | null;
  contact_name: string | null;
  requirements: string | null;
  apply_url: string | null;
}

interface JobSelectorProps {
  onSelectJob: (job: Job) => void;
  isGenerating: boolean;
  generatingJobId?: string;
}

const JobSelector = ({ onSelectJob, isGenerating, generatingJobId }: JobSelectorProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, title, hospital_name, department, location, contact_name, requirements, apply_url")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data) {
          setJobs(data);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Keine Stellenanzeigen verfügbar</p>
      </div>
    );
  }

  // Duplicate jobs for seamless infinite scroll
  const duplicatedJobs = [...jobs, ...jobs];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Verfügbare Stellenanzeigen</h3>
        <Badge variant="secondary" className="ml-auto">{jobs.length} Stellen</Badge>
      </div>

      <div className="relative h-[400px] overflow-hidden rounded-lg border border-border bg-gradient-to-b from-background to-muted/20">
        {/* Fade overlays for smooth visual effect */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

        {/* Scrolling container */}
        <div className="scroll-container py-4 px-4 space-y-3">
          {duplicatedJobs.map((job, index) => (
            <Card
              key={`${job.id}-${index}`}
              className="p-4 bg-card hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-border/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Hospital name */}
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-foreground truncate">
                      {job.hospital_name || "Klinik"}
                    </span>
                  </div>

                  {/* Department badge */}
                  {job.department && (
                    <Badge variant="outline" className="mb-2 text-xs">
                      {job.department}
                    </Badge>
                  )}

                  {/* Position title */}
                  <p className="font-medium text-sm mb-2 line-clamp-2">
                    {job.title || "Assistenzarzt Position"}
                  </p>

                  {/* Location */}
                  {job.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <Button
                  onClick={() => onSelectJob(job)}
                  disabled={isGenerating}
                  size="sm"
                  className="flex-shrink-0"
                  variant={generatingJobId === job.id ? "default" : "outline"}
                >
                  {isGenerating && generatingJobId === job.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      <span className="text-xs">Lädt...</span>
                    </>
                  ) : (
                    <span className="text-xs">Generieren →</span>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        💡 Bewegen Sie die Maus über die Liste, um die Animati on zu pausieren
      </p>
    </div>
  );
};

export default JobSelector;
