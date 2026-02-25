import { useState } from "react";
import {
    MapPin,
    Stethoscope,
    Briefcase,
    ChevronDown,
    ChevronUp,
    X,
    Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Bundesland extraction ──────────────────────────────────────────────────
const BUNDESLAND_KEYWORDS: Record<string, string> = {
    "Bayern": "Bayern",
    "Bavaria": "Bayern",
    "Nordrhein-Westfalen": "Nordrhein-Westfalen",
    "NRW": "Nordrhein-Westfalen",
    "Baden-Württemberg": "Baden-Württemberg",
    "Berlin": "Berlin",
    "Hamburg": "Hamburg",
    "Hessen": "Hessen",
    "Niedersachsen": "Niedersachsen",
    "Rheinland-Pfalz": "Rheinland-Pfalz",
    "Sachsen": "Sachsen",
    "Thüringen": "Thüringen",
    "Brandenburg": "Brandenburg",
    "Sachsen-Anhalt": "Sachsen-Anhalt",
    "Mecklenburg-Vorpommern": "Mecklenburg-Vorpommern",
    "Saarland": "Saarland",
    "Schleswig-Holstein": "Schleswig-Holstein",
    "Bremen": "Bremen",
    "Österreich": "Österreich",
    "Schweiz": "Schweiz",
};

const SORTED_BUNDESLAND_ENTRIES = Object.entries(BUNDESLAND_KEYWORDS).sort(
    (a, b) => b[0].length - a[0].length
);

export function extractBundesland(location: string | null): string | null {
    if (!location) return null;
    // More specific names (e.g. "Sachsen-Anhalt") are checked before "Sachsen".
    for (const [keyword, state] of SORTED_BUNDESLAND_ENTRIES) {
        if (location.includes(keyword)) return state;
    }
    return null;
}

// ─── Tag normalisation (canonicalise employment type from tags) ────────────
const STELLENART_TAGS = new Set([
    "vollzeit", "teilzeit", "weiterbildung", "rotation", "notaufnahme", "intensivstation",
]);

export function getJobStellenstartTags(tags: string[] | null): string[] {
    if (!tags) return [];
    return tags.filter((t) => STELLENART_TAGS.has(t.toLowerCase()));
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface FilterItem {
    value: string;
    count: number;
}

interface FilterSectionProps {
    label: string;
    icon: React.ReactNode;
    items: FilterItem[];
    activeSet: Set<string>;
    onToggle: (value: string) => void;
    searchable?: boolean;
}

// ─── FilterSection ───────────────────────────────────────────────────────────
const MAX_VISIBLE = 8;

const FilterSection = ({
    label,
    icon,
    items,
    activeSet,
    onToggle,
    searchable = false,
}: FilterSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [internalSearch, setInternalSearch] = useState("");

    if (items.length === 0) return null;

    const filtered = internalSearch.trim()
        ? items.filter((item) =>
            item.value.toLowerCase().includes(internalSearch.toLowerCase())
        )
        : items;

    const visible = expanded ? filtered : filtered.slice(0, MAX_VISIBLE);
    const hiddenCount = filtered.length - MAX_VISIBLE;

    return (
        <div className="border-b border-border/50 last:border-0">
            {/* Section header */}
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="w-full flex items-center justify-between py-3 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
                <span className="flex items-center gap-2">
                    {icon}
                    {label}
                </span>
                {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
            </button>

            {isOpen && (
                <div className="pb-3 space-y-1">
                    {/* Internal search for large option lists */}
                    {searchable && items.length > MAX_VISIBLE && (
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                                type="text"
                                value={internalSearch}
                                onChange={(e) => setInternalSearch(e.target.value)}
                                placeholder={`${label} suchen…`}
                                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                        </div>
                    )}

                    {visible.map(({ value, count }) => (
                        <label
                            key={value}
                            className="flex items-center justify-between gap-2 cursor-pointer group rounded-md px-1 py-0.5 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                    checked={activeSet.has(value)}
                                    onCheckedChange={() => onToggle(value)}
                                    className="shrink-0"
                                />
                                <span
                                    className={`text-sm truncate transition-colors ${activeSet.has(value)
                                            ? "text-foreground font-medium"
                                            : "text-muted-foreground group-hover:text-foreground"
                                        }`}
                                >
                                    {value}
                                </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground/60 tabular-nums shrink-0">
                                {count}
                            </span>
                        </label>
                    ))}

                    {!internalSearch && hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1 pl-1"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="h-3 w-3" /> Weniger
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3 w-3" /> +{hiddenCount} mehr
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export interface JobFiltersSidebarProps {
    locationItems: FilterItem[];
    departmentItems: FilterItem[];
    stellenartItems: FilterItem[];
    otherTagItems: FilterItem[];
    activeLocations: Set<string>;
    activeDepartments: Set<string>;
    activeTags: Set<string>;
    onToggleLocation: (value: string) => void;
    onToggleDepartment: (value: string) => void;
    onToggleTag: (value: string) => void;
    onClearAll: () => void;
    hasActiveFilters: boolean;
}

const JobFiltersSidebar = ({
    locationItems,
    departmentItems,
    stellenartItems,
    otherTagItems,
    activeLocations,
    activeDepartments,
    activeTags,
    onToggleLocation,
    onToggleDepartment,
    onToggleTag,
    onClearAll,
    hasActiveFilters,
}: JobFiltersSidebarProps) => {
    const activeCount =
        activeLocations.size + activeDepartments.size + activeTags.size;

    if (
        locationItems.length === 0 &&
        departmentItems.length === 0 &&
        stellenartItems.length === 0 &&
        otherTagItems.length === 0
    ) {
        return null;
    }

    return (
        <aside className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">Filter</span>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                    >
                        <X className="h-3 w-3" />
                        Zurücksetzen
                        <span className="ml-0.5 rounded-full bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-medium">
                            {activeCount}
                        </span>
                    </button>
                )}
            </div>

            <div className="space-y-0 divide-y-0">
                <FilterSection
                    label="Fachbereich"
                    icon={<Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />}
                    items={departmentItems}
                    activeSet={activeDepartments}
                    onToggle={onToggleDepartment}
                    searchable
                />
                <FilterSection
                    label="Bundesland"
                    icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
                    items={locationItems}
                    activeSet={activeLocations}
                    onToggle={onToggleLocation}
                />
                {stellenartItems.length > 0 && (
                    <FilterSection
                        label="Stellenart"
                        icon={<Briefcase className="h-3.5 w-3.5 text-muted-foreground" />}
                        items={stellenartItems}
                        activeSet={activeTags}
                        onToggle={onToggleTag}
                    />
                )}
                {otherTagItems.length > 0 && (
                    <FilterSection
                        label="Weitere Tags"
                        icon={<Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />}
                        items={otherTagItems}
                        activeSet={activeTags}
                        onToggle={onToggleTag}
                    />
                )}
            </div>
        </aside>
    );
};

export default JobFiltersSidebar;
