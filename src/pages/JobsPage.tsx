import { useDeferredValue, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logFunnelEvent } from "@/lib/app-events";
import {
  getRememberedExperimentVariant,
  rememberApplyIntent,
  rememberCtaClick,
} from "@/lib/attribution";
import { LANDING_HERO_CTA_EXPERIMENT_ID } from "@/lib/experiments";
import { applySeoMeta } from "@/lib/seo";
import { buildJobPath } from "@/lib/slug";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

import JobsNavBar from "@/components/jobs/JobsNavBar";
import JobsHero from "@/components/jobs/JobsHero";
import JobSearchBar from "@/components/jobs/JobSearchBar";
import type { SortOption } from "@/components/jobs/JobSearchBar";
import JobFilterChips from "@/components/jobs/JobFilterChips";
import JobCard from "@/components/jobs/JobCard";
import { JobCardSkeletonGrid } from "@/components/jobs/JobCardSkeleton";
import JobsEmptyState from "@/components/jobs/JobsEmptyState";

const JobsPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Tables<"jobs">[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activeLocations, setActiveLocations] = useState<Set<string>>(new Set());
  const [activeDepartments, setActiveDepartments] = useState<Set<string>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const deferredSearch = useDeferredValue(search);
  const baseUrl =
    (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/+$/, "") ||
    window.location.origin;

  // --- Auth ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Load jobs ---
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false });

      if (error) {
        setJobs([]);
        setIsLoading(false);
        return;
      }

      setJobs(data ?? []);
      setIsLoading(false);
    };

    void loadJobs();
  }, []);

  // --- Filters ---
  const hasActiveFilters =
    activeLocations.size > 0 || activeDepartments.size > 0 || activeTags.size > 0 || deferredSearch.trim().length > 0;

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setActiveLocations(new Set());
    setActiveDepartments(new Set());
    setActiveTags(new Set());
  }, []);

  const makeToggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
      (value: string) => {
        setter((prev) => {
          const next = new Set(prev);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          return next;
        });
      },
    []
  );

  const toggleLocation = useMemo(() => makeToggle(setActiveLocations), [makeToggle]);
  const toggleDepartment = useMemo(() => makeToggle(setActiveDepartments), [makeToggle]);
  const toggleTag = useMemo(() => makeToggle(setActiveTags), [makeToggle]);

  // --- Filter + sort ---
  const filteredJobs = useMemo(() => {
    let result = jobs;

    if (deferredSearch.trim()) {
      const term = deferredSearch.toLowerCase();
      result = result.filter((job) => {
        const haystack = [
          job.title,
          job.hospital_name,
          job.department,
          job.location,
          job.description,
          job.requirements,
          job.contact_email,
          job.contact_name,
          ...(job.tags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    if (activeLocations.size > 0) {
      result = result.filter((job) => job.location && activeLocations.has(job.location));
    }
    if (activeDepartments.size > 0) {
      result = result.filter((job) => job.department && activeDepartments.has(job.department));
    }
    if (activeTags.size > 0) {
      result = result.filter(
        (job) => job.tags && job.tags.some((tag) => activeTags.has(tag))
      );
    }

    const sorted = [...result];
    switch (sortBy) {
      case "expiring":
        sorted.sort((a, b) => {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
        });
        break;
      case "az":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "de"));
        break;
      case "newest":
      default:
        break;
    }

    return sorted;
  }, [deferredSearch, jobs, activeLocations, activeDepartments, activeTags, sortBy]);

  // --- SEO ---
  useEffect(() => {
    const canonicalUrl = `${baseUrl}/jobs`;
    const topJobs = jobs.slice(0, 20);

    applySeoMeta({
      title: "Assistenzarzt Jobs in Deutschland | Klaro",
      description:
        "Öffentliche Jobbörse für Assistenzarzt-Stellen in Deutschland. Stellen ansehen und mit Klaro schnell bewerben.",
      canonicalUrl,
      robots: "index,follow,max-image-preview:large",
      ogTitle: "Assistenzarzt Jobs in Deutschland | Klaro",
      ogDescription:
        "Stellenangebote entdecken, vergleichen und mit Klaro strukturiert bewerben.",
      ogType: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Klaro Jobbörse",
        url: canonicalUrl,
        description:
          "Öffentliche Jobbörse für Assistenzarzt-Stellen in Deutschland.",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: topJobs.map((job, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${baseUrl}${buildJobPath({
              id: job.id,
              title: job.title,
              hospitalName: job.hospital_name,
            })}`,
            name: job.title,
          })),
        },
      },
    });
  }, [baseUrl, jobs]);

  // --- Attribution ---
  const handleApplyClick = useCallback(
    (job: Tables<"jobs">) => {
      const jobPath = buildJobPath({
        id: job.id,
        title: job.title,
        hospitalName: job.hospital_name,
      });
      const rememberedLandingVariant = getRememberedExperimentVariant(
        LANDING_HERO_CTA_EXPERIMENT_ID
      );

      rememberApplyIntent({
        jobId: job.id,
        jobTitle: job.title,
        jobPath,
        source: "jobs_list",
      });
      rememberCtaClick({
        source: "jobs_apply_button",
        destination: jobPath,
        experimentId: LANDING_HERO_CTA_EXPERIMENT_ID,
        variant: rememberedLandingVariant,
      });

      if (isAuthenticated) {
        void logFunnelEvent("funnel_apply_click", {
          job_id: job.id,
          job_title: job.title,
          source: "jobs_list",
          job_path: jobPath,
        });
      }
    },
    [isAuthenticated]
  );

  return (
    <div className="min-h-screen bg-background">
      <JobsNavBar isAuthenticated={isAuthenticated} />

      <JobsHero jobCount={jobs.length} isLoading={isLoading} />

      {/* Sticky Search & Filters Bar */}
      <div className="sticky top-[57px] sm:top-[65px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
        <div className="container mx-auto px-4 sm:px-6 py-3 space-y-3">
          <JobSearchBar
            search={search}
            onSearchChange={setSearch}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
          <JobFilterChips
            jobs={jobs}
            activeLocations={activeLocations}
            activeDepartments={activeDepartments}
            activeTags={activeTags}
            onToggleLocation={toggleLocation}
            onToggleDepartment={toggleDepartment}
            onToggleTag={toggleTag}
            onClearAll={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {/* Results count + mobile sort */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `${filteredJobs.length} von ${jobs.length} Stellen`
                : `${jobs.length} ${jobs.length === 1 ? "Stelle" : "Stellen"}`}
            </p>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[160px] sm:hidden">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Neueste zuerst</SelectItem>
                <SelectItem value="expiring">Bald ablaufend</SelectItem>
                <SelectItem value="az">A &ndash; Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <JobCardSkeletonGrid count={6} />
        ) : filteredJobs.length === 0 ? (
          <JobsEmptyState
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
            activeLocations={activeLocations}
            activeDepartments={activeDepartments}
            activeTags={activeTags}
            search={search}
            totalJobCount={jobs.length}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onApplyClick={handleApplyClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;
