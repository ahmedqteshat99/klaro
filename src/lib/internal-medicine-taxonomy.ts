export interface InternalMedicineJobLike {
  title?: string | null;
  department?: string | null;
  description?: string | null;
  tags?: string[] | null;
}

interface InternalSubspecialtyDefinition {
  id: string;
  label: string;
  aliases: string[];
}

const INTERNAL_MEDICINE_BASE_ALIASES = [
  "innere medizin",
  "inneren medizin",
  "internal medicine",
  "internist",
  "internistin",
  "internistische",
];

const INTERNAL_MEDICINE_SUBSPECIALTY_DEFINITIONS: ReadonlyArray<InternalSubspecialtyDefinition> = [
  { id: "angiologie", label: "Angiologie", aliases: ["angiologie"] },
  { id: "endokrinologie-diabetologie", label: "Endokrinologie/Diabetologie", aliases: ["endokrinologie", "diabetologie"] },
  { id: "gastroenterologie", label: "Gastroenterologie", aliases: ["gastroenterologie"] },
  { id: "haematologie-onkologie", label: "Haematologie/Onkologie", aliases: ["haematologie", "hamatologie", "onkologie"] },
  { id: "infektiologie", label: "Infektiologie", aliases: ["infektiologie"] },
  { id: "kardiologie", label: "Kardiologie", aliases: ["kardiologie", "cardiology"] },
  { id: "nephrologie", label: "Nephrologie", aliases: ["nephrologie", "nephrology"] },
  { id: "pneumologie", label: "Pneumologie", aliases: ["pneumologie", "pulmologie", "pulmonologie"] },
  { id: "rheumatologie", label: "Rheumatologie", aliases: ["rheumatologie", "rheumatology"] },
] as const;

export const INTERNAL_MEDICINE_FILTER_ALL = "internal:all";
export const INTERNAL_MEDICINE_ALL_LABEL = "Innere Medizin (alle)";

export const INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS = INTERNAL_MEDICINE_SUBSPECIALTY_DEFINITIONS.map((definition) => ({
  ...definition,
  value: `internal:${definition.id}`,
})) as ReadonlyArray<InternalSubspecialtyDefinition & { value: string }>;

export const INTERNAL_MEDICINE_SUBSPECIALTY_FILTER_VALUES = new Set(
  INTERNAL_MEDICINE_SUBSPECIALTY_FILTERS.map((definition) => definition.value)
);

export interface InternalMedicineClassification {
  isInternalMedicine: boolean;
  matchedSubspecialtyIds: string[];
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAnyAlias(normalizedText: string, aliases: string[]): boolean {
  return aliases.some((alias) => normalizedText.includes(normalizeText(alias)));
}

function buildSearchText(job: InternalMedicineJobLike): string {
  return [
    job.department,
    job.title,
    job.description,
    ...(job.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function classifyInternalMedicineJob(job: InternalMedicineJobLike): InternalMedicineClassification {
  const normalizedText = normalizeText(buildSearchText(job));
  if (!normalizedText) {
    return { isInternalMedicine: false, matchedSubspecialtyIds: [] };
  }

  const matchedSubspecialtyIds = INTERNAL_MEDICINE_SUBSPECIALTY_DEFINITIONS
    .filter((definition) => includesAnyAlias(normalizedText, definition.aliases))
    .map((definition) => definition.id);

  const hasInternalMedicineBase = includesAnyAlias(normalizedText, INTERNAL_MEDICINE_BASE_ALIASES);

  return {
    isInternalMedicine: hasInternalMedicineBase || matchedSubspecialtyIds.length > 0,
    matchedSubspecialtyIds,
  };
}

export function isInternalMedicineFilterValue(value: string): boolean {
  return value === INTERNAL_MEDICINE_FILTER_ALL || INTERNAL_MEDICINE_SUBSPECIALTY_FILTER_VALUES.has(value);
}

export function isInternalMedicineSubspecialtyFilterValue(value: string): boolean {
  return INTERNAL_MEDICINE_SUBSPECIALTY_FILTER_VALUES.has(value);
}

export function matchesInternalMedicineFilter(job: InternalMedicineJobLike, filterValue: string): boolean {
  if (!isInternalMedicineFilterValue(filterValue)) return false;

  const classification = classifyInternalMedicineJob(job);

  if (filterValue === INTERNAL_MEDICINE_FILTER_ALL) {
    return classification.isInternalMedicine;
  }

  const subspecialtyId = filterValue.replace(/^internal:/, "");
  return classification.matchedSubspecialtyIds.includes(subspecialtyId);
}

export function isInternalMedicineDepartmentLabel(value: string): boolean {
  return classifyInternalMedicineJob({ department: value }).isInternalMedicine;
}

