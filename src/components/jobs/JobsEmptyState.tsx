import { Button } from "@/components/ui/button";
import { SearchX, X } from "lucide-react";

interface JobsEmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  activeLocations: Set<string>;
  activeDepartments: Set<string>;
  activeTags: Set<string>;
  search: string;
  totalJobCount: number;
}

const JobsEmptyState = ({
  hasActiveFilters,
  onClearFilters,
  activeLocations,
  activeDepartments,
  activeTags,
  search,
  totalJobCount,
}: JobsEmptyStateProps) => {
  // Build a contextual message about what's filtering results to zero
  const activeFilterNames: string[] = [];
  if (search.trim()) activeFilterNames.push(`"${search.trim()}"`);
  activeLocations.forEach((loc) => activeFilterNames.push(loc));
  activeDepartments.forEach((dep) => activeFilterNames.push(dep));
  activeTags.forEach((tag) => activeFilterNames.push(tag));

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Keine Stellen gefunden
      </h3>

      {activeFilterNames.length > 0 ? (
        <p className="text-sm text-muted-foreground max-w-md mb-2">
          Keine Ergebnisse für{" "}
          <span className="font-medium text-foreground">
            {activeFilterNames.slice(0, 3).join(", ")}
            {activeFilterNames.length > 3 && ` (+${activeFilterNames.length - 3})`}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground max-w-sm mb-2">
          Neue Stellen werden bald hinzugefügt.
        </p>
      )}

      {hasActiveFilters && totalJobCount > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          Ohne Filter: {totalJobCount} {totalJobCount === 1 ? "Stelle" : "Stellen"} verfügbar
        </p>
      )}

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Filter zurücksetzen
        </Button>
      )}
    </div>
  );
};

export default JobsEmptyState;
