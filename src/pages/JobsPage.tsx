import { useDeferredValue, useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BrandLogo from "@/components/BrandLogo";
import {
  ArrowUpDown,
  Building2,
  Clock,
  Loader2,
  MapPin,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isNewJob = (publishedAt: string | null) => {
  if (!publishedAt) return false;
  const published = new Date(publishedAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return published >= sevenDaysAgo;
};

const isExpiringSoon = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt);
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  return expires <= fourteenDaysFromNow && expires > new Date();
};

/** Strip HTML tags, collapse whitespace, and return a clean plain-text snippet. */
const snippetFromDescription = (raw: string | null, maxLen = 180): string | null => {
  if (!raw) return null;
  // Strip HTML tags, decode common entities, collapse whitespace
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.length < 10) return null;
  if (text.length <= maxLen) return text;
  // Truncate at last word boundary
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + "…";
};

type SortOption = "newest" | "expiring" | "az";

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // Extract unique filter values from all jobs
  const filterOptions = useMemo(() => {
    const locations = new Set<string>();
    const departments = new Set<string>();
    const tags = new Set<string>();

    for (const job of jobs) {
      if (job.location) locations.add(job.location);
      if (job.department) departments.add(job.department);
      if (job.tags) {
        for (const tag of job.tags) tags.add(tag);
      }
    }

    return {
      locations: Array.from(locations).sort(),
      departments: Array.from(departments).sort(),
      tags: Array.from(tags).sort(),
    };
  }, [jobs]);

  const hasActiveFilters =
    activeLocations.size > 0 || activeDepartments.size > 0 || activeTags.size > 0 || deferredSearch.trim().length > 0;

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setActiveLocations(new Set());
    setActiveDepartments(new Set());
    setActiveTags(new Set());
  }, []);

  const toggleFilter = useCallback(
    (set: Set<string>, value: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        return next;
      });
    },
    []
  );

  // Filter + sort jobs
  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Text search
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

    // Location filter
    if (activeLocations.size > 0) {
      result = result.filter((job) => job.location && activeLocations.has(job.location));
    }

    // Department filter
    if (activeDepartments.size > 0) {
      result = result.filter((job) => job.department && activeDepartments.has(job.department));
    }

    // Tag filter
    if (activeTags.size > 0) {
      result = result.filter(
        (job) => job.tags && job.tags.some((tag) => activeTags.has(tag))
      );
    }

    // Sort
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
        // Already sorted by published_at DESC from the query
        break;
    }

    return sorted;
  }, [deferredSearch, jobs, activeLocations, activeDepartments, activeTags, sortBy]);

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

  const handleApplyClick = (job: Tables<"jobs">) => {
    const jobPath = buildJobPath({
      id: job.id,
      title: job.title,
      hospitalName: job.hospital_name,
    });
    const destination = jobPath;
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
      destination,
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
                  <Link to="/inbox">Inbox</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
                  <Link to="/auth">Login</Link>
                </Button>
                <Button asChild size="sm" className="h-10 px-3 sm:h-9 sm:px-4">
                  <Link to="/auth">Registrieren</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-16 sm:pt-20">
        <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Assistenzarzt-Stellen
            </h1>
            <p className="text-muted-foreground mt-2 text-base sm:text-lg max-w-xl">
              Finden Sie Ihre nächste Stelle und bewerben Sie sich direkt mit Klaro.
            </p>
            {!isLoading && (
              <div className="mt-4 flex items-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1 font-medium">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {jobs.length} {jobs.length === 1 ? "offene Stelle" : "offene Stellen"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Search & Filters Bar */}
      <div className="sticky top-[57px] sm:top-[65px] z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Search + Sort Row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Suche nach Titel, Ort, Fachbereich..."
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px] hidden sm:flex">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Neueste zuerst</SelectItem>
                <SelectItem value="expiring">Bald ablaufend</SelectItem>
                <SelectItem value="az">A – Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Chips */}
          {(filterOptions.locations.length > 0 ||
            filterOptions.departments.length > 0 ||
            filterOptions.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {filterOptions.locations.map((loc) => (
                  <button
                    key={`loc-${loc}`}
                    type="button"
                    onClick={() => toggleFilter(activeLocations, loc, setActiveLocations)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${activeLocations.has(loc)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {loc}
                  </button>
                ))}
                {filterOptions.departments.map((dep) => (
                  <button
                    key={`dep-${dep}`}
                    type="button"
                    onClick={() => toggleFilter(activeDepartments, dep, setActiveDepartments)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${activeDepartments.has(dep)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {dep}
                  </button>
                ))}
                {filterOptions.tags.map((tag) => (
                  <button
                    key={`tag-${tag}`}
                    type="button"
                    onClick={() => toggleFilter(activeTags, tag, setActiveTags)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${activeTags.has(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Alle zurücksetzen
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {/* Results count */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `${filteredJobs.length} von ${jobs.length} Stellen`
                : `${jobs.length} ${jobs.length === 1 ? "Stelle" : "Stellen"}`}
            </p>
            {/* Mobile sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[160px] sm:hidden">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Neueste zuerst</SelectItem>
                <SelectItem value="expiring">Bald ablaufend</SelectItem>
                <SelectItem value="az">A – Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Enhanced Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Keine Stellen gefunden
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Versuchen Sie andere Suchbegriffe oder entfernen Sie aktive Filter.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-2" />
                Filter zurücksetzen
              </Button>
            )}
          </div>
        ) : (
          /* Job Cards Grid — 2 cols on desktop */
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredJobs.map((job) => {
              const jobPath = buildJobPath({
                id: job.id,
                title: job.title,
                hospitalName: job.hospital_name,
              });
              const isNew = isNewJob(job.published_at);
              const expiringSoon = isExpiringSoon(job.expires_at);

              return (
                <Card
                  key={job.id}
                  className="overflow-hidden transition-all hover:shadow-md hover:border-primary/20 flex flex-col"
                >
                  <Link to={jobPath} className="block flex-1 p-5 sm:p-6">
                    {/* Title Row with Badges */}
                    <div className="flex items-start gap-2 mb-3">
                      <h2 className="text-lg font-semibold text-foreground leading-snug flex-1 group-hover:underline">
                        {job.title}
                      </h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isNew && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0.5">
                            Neu
                          </Badge>
                        )}
                        {expiringSoon && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px] px-2 py-0.5">
                            <Clock className="h-3 w-3 mr-1" />
                            Bald ablaufend
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-1 mb-3">
                      {job.hospital_name && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{job.hospital_name}</span>
                          {job.department && (
                            <>
                              <span className="text-border">·</span>
                              <span>{job.department}</span>
                            </>
                          )}
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{job.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Description Snippet */}
                    {(() => {
                      const snippet = snippetFromDescription(job.description);
                      return snippet ? (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {snippet}
                        </p>
                      ) : null;
                    })()}

                    {/* Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {job.tags.map((tag) => (
                          <Badge key={`${job.id}-${tag}`} variant="secondary" className="text-[11px] px-2 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>

                  {/* Footer: Date + Apply Button */}
                  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-border/50 bg-muted/30">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(job.published_at)}
                      {job.expires_at && ` · Bis ${formatDate(job.expires_at)}`}
                    </span>
                    <Button asChild size="sm" className="shrink-0">
                      <Link
                        to={jobPath}
                        onClick={() => handleApplyClick(job)}
                      >
                        Bewerben
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;
