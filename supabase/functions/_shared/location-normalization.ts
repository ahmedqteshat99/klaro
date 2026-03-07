import { CITY_TO_STATE, CLINIC_OVERRIDES, FOREIGN_CITIES, PLZ_TO_STATE } from "./plz-data.ts";
import { enrichLocationWithState } from "./enrich-location.ts";

const MEDICAL_TERMS = [
  "radiologie",
  "kardiologie",
  "chirurgie",
  "anästhesie",
  "anasthesie",
  "neurologie",
  "gynäkologie",
  "gynakologie",
  "pädiatrie",
  "padiatrie",
  "psychiatrie",
  "orthopädie",
  "orthopadie",
  "urologie",
  "dermatologie",
  "onkologie",
  "pneumologie",
  "nephrologie",
  "gastroenterologie",
  "innere medizin",
  "intensivmedizin",
  "notaufnahme",
  "allgemeinmedizin",
  "nuklearmedizin",
  "pathologie",
  "hämatologie",
  "hamatologie",
  "endokrinologie",
  "rheumatologie",
  "geriatrie",
  "neonatologie",
  "weiterbildung",
  "facharzt",
  "oberarzt",
  "assistenzarzt",
  "assistenzärztin",
  "arzt in weiterbildung",
  "ärztin in weiterbildung",
  "weiterbildungsassistent",
  "weiterbildungsassistentin",
  "gefäßchirurgie",
  "unfallchirurgie",
  "viszeralchirurgie",
  "herzchirurgie",
  "thoraxchirurgie",
  "kinderchirurgie",
  "hals-nasen-ohrenheilkunde",
  "augenheilkunde",
  "palliativmedizin",
  "arbeitsmedizin",
  "rechtsmedizin",
  "mikrobiologie",
  "virologie",
  "transfusionsmedizin",
  "strahlentherapie",
  "laboratoriumsmedizin",
];

const GENERIC_LOCATION_TERMS = [
  "klinik",
  "klinikum",
  "krankenhaus",
  "hospital",
  "praxis",
  "medizinisches zentrum",
  "gesundheitszentrum",
  "universitätsklinikum",
  "universitaetsklinikum",
  "campus",
  "standort",
  "location",
  "ort",
  "einsatzort",
  "arbeitsort",
  "bundesweit",
  "deutschlandweit",
  "remote",
  "homeoffice",
  "hybrid",
];

const INVALID_LOCATION_TERMS = [...MEDICAL_TERMS, ...GENERIC_LOCATION_TERMS];
const INVALID_LOCATION_SET = new Set(INVALID_LOCATION_TERMS);

const LOCATION_LABELS = /^(?:standort|location|ort|einsatzort|arbeitsort)\s*:?\s*/i;
const INVALID_CHARACTERS = /[@/]|https?:\/\//i;
const PLZ_CITY_PATTERN = /\b(\d{5})\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+){0,4})\b/;
const SPLIT_PATTERN = /[,;|]|\s[–-]\s/;
const TOKEN_PATTERN = /[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g;
const GERMAN_STATE_OR_COUNTRY = [
  "baden-württemberg",
  "baden wuerttemberg",
  "bayern",
  "berlin",
  "brandenburg",
  "bremen",
  "hamburg",
  "hessen",
  "mecklenburg-vorpommern",
  "niedersachsen",
  "nordrhein-westfalen",
  "rheinland-pfalz",
  "saarland",
  "sachsen-anhalt",
  "sachsen",
  "schleswig-holstein",
  "thüringen",
  "thueringen",
  "österreich",
  "oesterreich",
  "schweiz",
];

export interface LocationNormalizationInput {
  rawLocation?: string | null;
  hospitalName?: string | null;
  title?: string | null;
  description?: string | null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanLocationText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(LOCATION_LABELS, "")
      .replace(/[•*]+/g, " ")
      .replace(/\s+/g, " ")
  );
}

function lookupCity(cityLower: string): string | null {
  return CLINIC_OVERRIDES[cityLower] ?? CITY_TO_STATE[cityLower] ?? FOREIGN_CITIES[cityLower] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsInvalidTerm(value: string): boolean {
  const normalized = value.toLowerCase();
  return INVALID_LOCATION_TERMS.some((term) => {
    const pattern = new RegExp(`(^|[^a-zäöüß])${escapeRegExp(term)}([^a-zäöüß]|$)`, "i");
    return pattern.test(normalized);
  });
}

function hasStateOrCountryLabel(value: string): boolean {
  const lower = value.toLowerCase();
  return GERMAN_STATE_OR_COUNTRY.some((label) => lower.includes(label));
}

function validateAndEnrichCandidate(candidate: string): string | null {
  const cleaned = cleanLocationText(candidate);
  if (!cleaned || cleaned.length < 3) return null;
  if (INVALID_CHARACTERS.test(cleaned)) return null;
  if (containsInvalidTerm(cleaned)) return null;

  const plzMatch = cleaned.match(PLZ_CITY_PATTERN);
  if (plzMatch) {
    const normalized = `${plzMatch[1]} ${normalizeWhitespace(plzMatch[2])}`;
    const enriched = enrichLocationWithState(normalized);
    return containsInvalidTerm(enriched) ? null : enriched;
  }

  const lower = cleaned.toLowerCase();
  const cityState = lookupCity(lower);
  if (cityState) {
    return cleaned.toLowerCase().includes(cityState.toLowerCase()) && cleaned.includes(",")
      ? cleaned
      : `${cleaned}, ${cityState}`;
  }

  if (hasStateOrCountryLabel(cleaned)) {
    if (cleaned.includes(",")) return cleaned;
    if (GERMAN_STATE_OR_COUNTRY.includes(lower)) return cleaned;
  }

  const enriched = enrichLocationWithState(cleaned);
  return enriched !== cleaned && !containsInvalidTerm(enriched) ? enriched : null;
}

function findKnownLocationInText(text: string): string | null {
  const cleaned = cleanLocationText(text);
  if (!cleaned) return null;

  const tokens = cleaned.match(TOKEN_PATTERN) ?? [];
  if (tokens.length === 0) return null;

  for (let size = Math.min(tokens.length, 5); size >= 1; size--) {
    for (let start = 0; start <= tokens.length - size; start++) {
      const phrase = normalizeWhitespace(tokens.slice(start, start + size).join(" "));
      const enriched = validateAndEnrichCandidate(phrase);
      if (enriched) return enriched;
    }
  }

  return null;
}

function extractFromRawLocation(rawLocation: string | null | undefined): string | null {
  if (!rawLocation) return null;

  const cleaned = cleanLocationText(rawLocation);
  if (!cleaned) return null;

  const direct = validateAndEnrichCandidate(cleaned);
  if (direct) return direct;

  for (const part of cleaned.split(SPLIT_PATTERN).map(cleanLocationText)) {
    const candidate = validateAndEnrichCandidate(part);
    if (candidate) return candidate;
  }

  return findKnownLocationInText(cleaned);
}

function extractFromHospitalName(hospitalName: string | null | undefined): string | null {
  if (!hospitalName) return null;

  const enriched = enrichLocationWithState(hospitalName);
  if (enriched !== hospitalName && !containsInvalidTerm(enriched)) {
    return enriched;
  }

  return findKnownLocationInText(hospitalName);
}

function extractFromFreeText(text: string | null | undefined): string | null {
  if (!text) return null;

  const cleaned = cleanLocationText(text);
  if (!cleaned) return null;

  const plzMatch = cleaned.match(PLZ_CITY_PATTERN);
  if (plzMatch) {
    const plzCandidate = validateAndEnrichCandidate(`${plzMatch[1]} ${plzMatch[2]}`);
    if (plzCandidate) return plzCandidate;
  }

  const labeledMatch = cleaned.match(
    /(?:standort|location|ort|einsatzort|arbeitsort)\s*:?\s*([^.,;\n]+)/i
  );
  if (labeledMatch?.[1]) {
    const labeledCandidate = extractFromRawLocation(labeledMatch[1]);
    if (labeledCandidate) return labeledCandidate;
  }

  return findKnownLocationInText(cleaned);
}

export function isLikelyInvalidLocation(location: string | null | undefined): boolean {
  if (!location || !location.trim()) return true;
  return extractFromRawLocation(location) === null;
}

export function normalizeJobLocation(input: LocationNormalizationInput): string | null {
  return (
    extractFromRawLocation(input.rawLocation) ??
    extractFromHospitalName(input.hospitalName) ??
    extractFromFreeText([input.title, input.description].filter(Boolean).join(" ")) ??
    extractFromFreeText(input.description) ??
    null
  );
}
