import { useDeferredValue, useEffect, useMemo, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { logFunnelEvent } from "@/lib/app-events";
import {
  getRememberedExperimentVariant,
  rememberApplyIntent,
  rememberCtaClick,
} from "@/lib/attribution";
import { LANDING_HERO_CTA_EXPERIMENT_ID } from "@/lib/experiments";
import {
  INTERNAL_MEDICINE_ALL_LABEL,
  INTERNAL_MEDICINE_FILTER_ALL,
  INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS,
  classifyInternalMedicineJob,
  isInternalMedicineDepartmentLabel,
  isInternalMedicineFilterValue,
  isInternalMedicineSubspecialtyFilterValue,
  matchesInternalMedicineFilter,
} from "@/lib/internal-medicine-taxonomy";
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
import JobFiltersSidebar, {
  extractBundesland,
  type FilterItem,
} from "@/components/jobs/JobFiltersSidebar";
import JobCard from "@/components/jobs/JobCard";
import { JobCardSkeletonGrid } from "@/components/jobs/JobCardSkeleton";
import JobsEmptyState from "@/components/jobs/JobsEmptyState";

type JobRow = Tables<"jobs">;
const STELLENART_TAGS = new Set([
  "vollzeit", "teilzeit", "weiterbildung", "rotation", "notaufnahme", "intensivstation",
]);

const sortFilterItems = (map: Map<string, number>): FilterItem[] =>
  Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "de"));

const jobMatchesSearch = (job: JobRow, normalizedSearch: string): boolean => {
  if (!normalizedSearch) return true;

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

  return haystack.includes(normalizedSearch);
};

const jobMatchesLocationFilters = (job: JobRow, activeLocations: Set<string>): boolean => {
  if (activeLocations.size === 0) return true;
  const bundesland = extractBundesland(job.location);
  return bundesland !== null && activeLocations.has(bundesland);
};

const jobMatchesDepartmentValue = (job: JobRow, departmentValue: string): boolean => {
  if (isInternalMedicineFilterValue(departmentValue)) {
    return matchesInternalMedicineFilter(job, departmentValue);
  }

  const departmentLower = job.department?.toLowerCase() ?? "";
  const needle = departmentValue.toLowerCase();
  if (departmentLower.startsWith(needle)) return true;
  return (job.tags ?? []).some((tag) => tag.toLowerCase() === needle);
};

const jobMatchesDepartmentFilters = (job: JobRow, activeDepartments: Set<string>): boolean => {
  if (activeDepartments.size === 0) return true;
  return [...activeDepartments].some((department) => jobMatchesDepartmentValue(job, department));
};

const jobMatchesTagFilters = (job: JobRow, activeTags: Set<string>): boolean => {
  if (activeTags.size === 0) return true;
  const tagsLower = new Set((job.tags ?? []).map((tag) => tag.toLowerCase()));
  return [...activeTags].some((tag) => tagsLower.has(tag.toLowerCase()));
};

const JobsPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  // Locations now stores Bundesland values (derived from job.location)
  const [activeLocations, setActiveLocations] = useState<Set<string>>(new Set());
  const [activeDepartments, setActiveDepartments] = useState<Set<string>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = useMemo(() => deferredSearch.trim().toLowerCase(), [deferredSearch]);
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
    activeLocations.size > 0 || activeDepartments.size > 0 || activeTags.size > 0 || normalizedSearch.length > 0;

  const activeFilterCount = activeLocations.size + activeDepartments.size + activeTags.size;

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setActiveLocations(new Set());
    setActiveDepartments(new Set());
    setActiveTags(new Set());
  }, []);

  const makeToggle = useCallback(
    (setter: Dispatch<SetStateAction<Set<string>>>) =>
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
  const toggleDepartment = useCallback((value: string) => {
    setActiveDepartments((prev) => {
      const next = new Set(prev);

      if (value === INTERNAL_MEDICINE_FILTER_ALL) {
        if (next.has(value)) {
          next.delete(value);
          return next;
        }

        next.add(value);
        for (const subspecialty of INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS) {
          next.delete(subspecialty.value);
        }
        return next;
      }

      if (isInternalMedicineSubspecialtyFilterValue(value)) {
        if (next.has(value)) {
          next.delete(value);
          return next;
        }

        next.delete(INTERNAL_MEDICINE_FILTER_ALL);
        next.add(value);
        return next;
      }

      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);
  const toggleTag = useMemo(() => makeToggle(setActiveTags), [makeToggle]);

  const filterFacetCounts = useMemo(() => {
    // Each facet is computed against all active filters except itself.
    const locationFacetJobs = jobs.filter(
      (job) =>
        jobMatchesSearch(job, normalizedSearch) &&
        jobMatchesDepartmentFilters(job, activeDepartments) &&
        jobMatchesTagFilters(job, activeTags)
    );

    const departmentFacetJobs = jobs.filter(
      (job) =>
        jobMatchesSearch(job, normalizedSearch) &&
        jobMatchesLocationFilters(job, activeLocations) &&
        jobMatchesTagFilters(job, activeTags)
    );

    const tagFacetJobs = jobs.filter(
      (job) =>
        jobMatchesSearch(job, normalizedSearch) &&
        jobMatchesLocationFilters(job, activeLocations) &&
        jobMatchesDepartmentFilters(job, activeDepartments)
    );

    const locationCounts = new Map<string, number>();
    for (const job of locationFacetJobs) {
      const bundesland = extractBundesland(job.location);
      if (!bundesland) continue;
      locationCounts.set(bundesland, (locationCounts.get(bundesland) ?? 0) + 1);
    }
    for (const activeLocation of activeLocations) {
      if (!locationCounts.has(activeLocation)) locationCounts.set(activeLocation, 0);
    }

    const departmentValues = new Set<string>();
    for (const job of jobs) {
      if (job.department && !isInternalMedicineDepartmentLabel(job.department)) {
        departmentValues.add(job.department);
      }
    }
    for (const activeDepartment of activeDepartments) {
      if (!isInternalMedicineFilterValue(activeDepartment)) {
        departmentValues.add(activeDepartment);
      }
    }

    const departmentCounts = new Map<string, number>();
    for (const department of departmentValues) {
      let count = 0;
      for (const job of departmentFacetJobs) {
        if (jobMatchesDepartmentValue(job, department)) count++;
      }
      departmentCounts.set(department, count);
    }

    const internalCounts = new Map<string, number>();
    internalCounts.set(INTERNAL_MEDICINE_FILTER_ALL, 0);
    for (const subspecialty of INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS) {
      internalCounts.set(subspecialty.value, 0);
    }

    for (const job of departmentFacetJobs) {
      const classification = classifyInternalMedicineJob(job);
      if (!classification.isInternalMedicine) continue;

      internalCounts.set(
        INTERNAL_MEDICINE_FILTER_ALL,
        (internalCounts.get(INTERNAL_MEDICINE_FILTER_ALL) ?? 0) + 1
      );

      for (const matchedSubspecialtyId of classification.matchedSubspecialtyIds) {
        const subspecialty = INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS.find(
          (entry) => entry.id === matchedSubspecialtyId
        );
        if (!subspecialty) continue;
        internalCounts.set(
          subspecialty.value,
          (internalCounts.get(subspecialty.value) ?? 0) + 1
        );
      }
    }

    const hasInternalSelection = [...activeDepartments].some((value) => isInternalMedicineFilterValue(value));
    const hasAnyInternalJobs = [...internalCounts.values()].some((count) => count > 0);
    const internalMedicineItems: FilterItem[] = hasAnyInternalJobs || hasInternalSelection
      ? [
        {
          value: INTERNAL_MEDICINE_FILTER_ALL,
          label: INTERNAL_MEDICINE_ALL_LABEL,
          count: internalCounts.get(INTERNAL_MEDICINE_FILTER_ALL) ?? 0,
        },
        ...INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS.map((subspecialty) => ({
          value: subspecialty.value,
          label: `↳ ${subspecialty.label}`,
          count: internalCounts.get(subspecialty.value) ?? 0,
        })),
      ]
      : [];

    const tagCounts = new Map<string, number>();
    for (const job of tagFacetJobs) {
      for (const tag of job.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    for (const activeTag of activeTags) {
      if (!tagCounts.has(activeTag)) tagCounts.set(activeTag, 0);
    }

    const allTagItems = sortFilterItems(tagCounts);

    return {
      locationItems: sortFilterItems(locationCounts),
      internalMedicineItems,
      departmentItems: sortFilterItems(departmentCounts),
      stellenartItems: allTagItems.filter((item) => STELLENART_TAGS.has(item.value.toLowerCase())),
      otherTagItems: allTagItems.filter((item) => !STELLENART_TAGS.has(item.value.toLowerCase())),
    };
  }, [jobs, normalizedSearch, activeDepartments, activeLocations, activeTags]);

  // --- Filter + sort ---
  const filteredJobs = useMemo(() => {
    const result = jobs.filter(
      (job) =>
        jobMatchesSearch(job, normalizedSearch) &&
        jobMatchesLocationFilters(job, activeLocations) &&
        jobMatchesDepartmentFilters(job, activeDepartments) &&
        jobMatchesTagFilters(job, activeTags)
    );

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
  }, [normalizedSearch, jobs, activeLocations, activeDepartments, activeTags, sortBy]);

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
      locationItems={filterFacetCounts.locationItems}
      internalMedicineItems={filterFacetCounts.internalMedicineItems}
      departmentItems={filterFacetCounts.departmentItems}
      stellenartItems={filterFacetCounts.stellenartItems}
      otherTagItems={filterFacetCounts.otherTagItems}
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
              <div className="max-h-[calc(100vh-(57px+57px+1.5rem))] sm:max-h-[calc(100vh-(65px+57px+1.5rem))] overflow-y-auto pr-2 pb-2">
                {sidebarContent}
              </div>
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
