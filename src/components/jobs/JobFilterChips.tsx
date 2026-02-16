import { useState, useCallback } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { MapPin, Stethoscope, Tag, X, ChevronDown, ChevronUp } from "lucide-react";

interface FilterCategory {
  label: string;
  icon: React.ReactNode;
  items: { value: string; count: number }[];
  activeSet: Set<string>;
  onToggle: (value: string) => void;
}

interface JobFilterChipsProps {
  jobs: Tables<"jobs">[];
  activeLocations: Set<string>;
  activeDepartments: Set<string>;
  activeTags: Set<string>;
  onToggleLocation: (value: string) => void;
  onToggleDepartment: (value: string) => void;
  onToggleTag: (value: string) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

const MAX_VISIBLE = 6;

const FilterGroup = ({ label, icon, items, activeSet, onToggle }: FilterCategory) => {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const visibleItems = expanded ? items : items.slice(0, MAX_VISIBLE);
  const hiddenCount = items.length - MAX_VISIBLE;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mr-1 flex items-center gap-1">
        {icon}
        {label}
      </span>
      {visibleItems.map(({ value, count }) => (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors ${
            activeSet.has(value)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {value}
          <span className={`text-[10px] ${activeSet.has(value) ? "text-primary-foreground/70" : "text-muted-foreground/50"}`}>
            {count}
          </span>
        </button>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              Weniger
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              +{hiddenCount} mehr
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

const JobFilterChips = ({
  jobs,
  activeLocations,
  activeDepartments,
  activeTags,
  onToggleLocation,
  onToggleDepartment,
  onToggleTag,
  onClearAll,
  hasActiveFilters,
}: JobFilterChipsProps) => {
  // Compute filter options with counts
  const computeCounts = useCallback(() => {
    const locationCounts = new Map<string, number>();
    const departmentCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const job of jobs) {
      if (job.location) {
        locationCounts.set(job.location, (locationCounts.get(job.location) ?? 0) + 1);
      }
      if (job.department) {
        departmentCounts.set(job.department, (departmentCounts.get(job.department) ?? 0) + 1);
      }
      if (job.tags) {
        for (const tag of job.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    }

    const toSorted = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "de"));

    return {
      locations: toSorted(locationCounts),
      departments: toSorted(departmentCounts),
      tags: toSorted(tagCounts),
    };
  }, [jobs]);

  const { locations, departments, tags } = computeCounts();

  if (locations.length === 0 && departments.length === 0 && tags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <FilterGroup
        label="Standort"
        icon={<MapPin className="h-3 w-3" />}
        items={locations}
        activeSet={activeLocations}
        onToggle={onToggleLocation}
      />
      <FilterGroup
        label="Abteilung"
        icon={<Stethoscope className="h-3 w-3" />}
        items={departments}
        activeSet={activeDepartments}
        onToggle={onToggleDepartment}
      />
      <FilterGroup
        label="Tags"
        icon={<Tag className="h-3 w-3" />}
        items={tags}
        activeSet={activeTags}
        onToggle={onToggleTag}
      />
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3 w-3" />
          Alle Filter zurücksetzen
        </button>
      )}
    </div>
  );
};

export default JobFilterChips;
