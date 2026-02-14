import type { JobData as ExtractedJobData } from "@/lib/api/generation";

export interface AdminJobFormValues {
  title: string;
  hospital_name: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  contact_email: string;
  contact_name: string;
  apply_url: string;
  tags: string;
}

export interface JobImportMappingResult {
  nextForm: AdminJobFormValues;
  importedFields: Array<keyof AdminJobFormValues>;
  missingFields: Array<keyof AdminJobFormValues>;
}

const ADMIN_IMPORT_FIELDS: Array<keyof AdminJobFormValues> = [
  "title",
  "hospital_name",
  "department",
  "location",
  "description",
  "requirements",
  "contact_email",
  "contact_name",
  "apply_url",
  "tags",
];

export const ADMIN_IMPORT_FIELD_LABELS: Record<keyof AdminJobFormValues, string> = {
  title: "Titel",
  hospital_name: "Krankenhaus",
  department: "Fachabteilung",
  location: "Standort",
  description: "Beschreibung",
  requirements: "Anforderungen",
  contact_email: "Kontakt E-Mail",
  contact_name: "Kontaktperson",
  apply_url: "Anzeigen-Link",
  tags: "Tags",
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return normalizeWhitespace(value);
};

const pickFirstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return "";
};

const normalizeTags = (value: unknown): string => {
  if (Array.isArray(value)) {
    const tags = value
      .map((entry) => normalizeString(entry))
      .filter(Boolean);
    return tags.join(", ");
  }
  if (typeof value === "string") {
    const tags = value
      .split(/[;,]/g)
      .map((entry) => normalizeString(entry))
      .filter(Boolean);
    return tags.join(", ");
  }
  return "";
};

export const mapExtractedJobToAdminForm = (params: {
  currentForm: AdminJobFormValues;
  extracted: Partial<ExtractedJobData> | null | undefined;
  sourceUrl?: string;
  overwriteExisting?: boolean;
}): JobImportMappingResult => {
  const extracted = params.extracted ?? {};
  const sourceUrl = normalizeString(params.sourceUrl);
  const overwriteExisting = Boolean(params.overwriteExisting);

  const incoming: AdminJobFormValues = {
    title: pickFirstNonEmpty(extracted.title, extracted.position),
    hospital_name: pickFirstNonEmpty(extracted.hospital_name, extracted.krankenhaus),
    department: pickFirstNonEmpty(extracted.department, extracted.fachabteilung),
    location: pickFirstNonEmpty(extracted.location, extracted.standort),
    description: pickFirstNonEmpty(extracted.description),
    requirements: pickFirstNonEmpty(extracted.requirements, extracted.anforderungen),
    contact_email: pickFirstNonEmpty(extracted.contact_email),
    contact_name: pickFirstNonEmpty(extracted.contact_name, extracted.ansprechpartner),
    apply_url: pickFirstNonEmpty(extracted.apply_url, sourceUrl),
    tags: normalizeTags(extracted.tags),
  };

  const nextForm: AdminJobFormValues = { ...params.currentForm };
  const importedFields: Array<keyof AdminJobFormValues> = [];

  for (const key of ADMIN_IMPORT_FIELDS) {
    const currentValue = normalizeString(nextForm[key]);
    const incomingValue = normalizeString(incoming[key]);
    if (!incomingValue) continue;

    const shouldWrite = overwriteExisting || !currentValue;
    if (!shouldWrite) continue;

    if (currentValue !== incomingValue) {
      nextForm[key] = incomingValue;
      importedFields.push(key);
    }
  }

  const missingFields = ADMIN_IMPORT_FIELDS.filter((key) => !normalizeString(nextForm[key]));

  return {
    nextForm,
    importedFields,
    missingFields,
  };
};

