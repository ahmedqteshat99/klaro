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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";

import JobsNavBar from "@/components/jobs/JobsNavBar";
import JobsHero from "@/components/jobs/JobsHero";
import JobSearchBar from "@/components/jobs/JobSearchBar";
import type { SortOption } from "@/components/jobs/JobSearchBar";
import JobFiltersSidebar, { extractBundesland } from "@/components/jobs/JobFiltersSidebar";
import JobCard from "@/components/jobs/JobCard";
import { JobCardSkeletonGrid } from "@/components/jobs/JobCardSkeleton";
import JobsEmptyState from "@/components/jobs/JobsEmptyState";

const JobsPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Tables<"jobs">[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  // Locations now stores Bundesland values (derived from job.location)
  const [activeLocations, setActiveLocations] = useState<Set<string>>(new Set());
  const [activeDepartments, setActiveDepartments] = useState<Set<string>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
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

  const activeFilterCount = activeLocations.size + activeDepartments.size + activeTags.size;

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

    // Full-text search across all fields
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

    // Bundesland filter — match against derived Bundesland from job.location
    if (activeLocations.size > 0) {
      result = result.filter((job) => {
        const bl = extractBundesland(job.location);
        return bl !== null && activeLocations.has(bl);
      });
    }

    // Department filter — case-insensitive, cross-references tags too
    if (activeDepartments.size > 0) {
      result = result.filter((job) => {
        const deptLower = job.department?.toLowerCase() ?? "";
        const tagsLower = (job.tags ?? []).map((t) => t.toLowerCase());
        return [...activeDepartments].some((d) => {
          const dLower = d.toLowerCase();
          return deptLower === dLower || tagsLower.includes(dLower);
        });
      });
    }

    // Tag filter — case-insensitive
    if (activeTags.size > 0) {
      result = result.filter((job) => {
        const tagsLower = (job.tags ?? []).map((t) => t.toLowerCase());
        return [...activeTags].some((t) => tagsLower.includes(t.toLowerCase()));
      });
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

  // ─── Sidebar content (shared between desktop and mobile sheet) ────────────
  const sidebarContent = (
    <JobFiltersSidebar
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
  );

  return (
    <div className="min-h-screen bg-background">
      <JobsNavBar isAuthenticated={isAuthenticated} />

      <JobsHero jobCount={jobs.length} isLoading={isLoading} />

      {/* Sticky Search Bar */}
      <div className="sticky top-[57px] sm:top-[65px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden shrink-0 gap-1.5"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>

            <JobSearchBar
              search={search}
              onSearchChange={setSearch}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar (desktop) + Job Grid */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="sticky top-[calc(57px+57px+1rem)] sm:top-[calc(65px+57px+1rem)]">
              {sidebarContent}
            </div>
          </div>

          {/* Results column */}
          <div className="flex-1 min-w-0">
            {/* Results header: count + sort */}
            {!isLoading && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? `${filteredJobs.length} von ${jobs.length} Stellen`
                    : `${jobs.length} ${jobs.length === 1 ? "Stelle" : "Stellen"}`}
                </p>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[160px]">
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} onApplyClick={handleApplyClick} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
