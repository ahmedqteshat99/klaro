import { PLZ_TO_STATE, CITY_TO_STATE, FOREIGN_CITIES, CLINIC_OVERRIDES } from "./plz-data.ts";

const GERMAN_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen-Anhalt",
  "Sachsen", "Schleswig-Holstein", "Thüringen",
];

const COUNTRY_LABELS = ["Österreich", "Schweiz"];

const ALL_LABELS = [...GERMAN_STATES, ...COUNTRY_LABELS];
const ALL_LABELS_LOWER = ALL_LABELS.map((s) => s.toLowerCase());

/** Try to find a city in CLINIC_OVERRIDES, CITY_TO_STATE, or FOREIGN_CITIES. Returns the label or null. */
function lookupCity(cityLower: string): string | null {
  return CLINIC_OVERRIDES[cityLower] ?? CITY_TO_STATE[cityLower] ?? FOREIGN_CITIES[cityLower] ?? null;
}

/**
 * Enrich a location string with its German Bundesland (or country for AT/CH).
 * Returns the original string with ", Bundesland" appended, or unchanged if no match.
 *
 * Strategy chain (in priority order):
 * 1. Already enriched → return as-is
 * 2. Clinic/facility override → append known state
 * 3. PLZ extraction → look up any 5-digit number in PLZ_TO_STATE
 * 4. Exact city match on each comma-separated part
 * 5. Suffix stripping → "City an der X" → try "City"
 * 6. Parenthetical stripping → "City (Mark)" → try "City"
 * 7. First-word fallback → try first word of multi-word part
 * 8. No match → return unchanged
 */
export function enrichLocationWithState(location: string): string {
  if (!location) return location;

  const locationLower = location.toLowerCase();

  // 1. Already has a Bundesland or country label → skip
  if (ALL_LABELS_LOWER.some((label) => locationLower.includes(label))) {
    return location;
  }

  // 2. Clinic/facility name override
  const clinicState = CLINIC_OVERRIDES[locationLower];
  if (clinicState) return `${location}, ${clinicState}`;

  // 3. Extract ALL 5-digit numbers as PLZ candidates
  const plzMatches = location.match(/\b\d{5}\b/g);
  if (plzMatches) {
    for (const plz of plzMatches) {
      const state = PLZ_TO_STATE[plz];
      if (state) return `${location}, ${state}`;
    }
  }

  // 4–7. Try each comma/semicolon-separated part
  const parts = location.split(/[,;]/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Clean the part: remove numbers and extra whitespace
    const cleanPart = part
      .replace(/\b\d{5}\b/g, "") // remove PLZ
      .replace(/^\d+\s*/, "")     // remove leading street numbers like "J 5"
      .trim();

    if (!cleanPart) continue;

    // Skip parts that look like street addresses
    if (/straße|strasse|str\.|weg\s|platz\s|allee\s|gasse/i.test(cleanPart)) continue;

    const partLower = cleanPart.toLowerCase();

    // 4. Exact city match
    const exactMatch = lookupCity(partLower);
    if (exactMatch) return `${location}, ${exactMatch}`;

    // 5. Suffix stripping: "City an der/in der/am/vor der/ob der/bei X"
    const suffixMatch = partLower.match(
      /^(.+?)\s+(?:an der|an den|an dem|am|im|in der|in dem|ob der|vor der|bei)\s+/i
    );
    if (suffixMatch) {
      const cityOnly = suffixMatch[1].trim();
      const suffixResult = lookupCity(cityOnly);
      if (suffixResult) return `${location}, ${suffixResult}`;
    }

    // 6. Parenthetical stripping: "City (Mark)" → "City"
    const parenMatch = partLower.match(/^(.+?)\s*\(.*\)\s*$/);
    if (parenMatch) {
      const cityOnly = parenMatch[1].trim();
      const parenResult = lookupCity(cityOnly);
      if (parenResult) return `${location}, ${parenResult}`;
    }

    // 7. First-word fallback for multi-word parts: "Bad Aibling" → "bad aibling" already tried,
    //    but "Weißenburg in Bayern" → try "weißenburg"
    const words = partLower.split(/\s+/);
    if (words.length > 1) {
      const firstWord = words[0];
      const firstResult = lookupCity(firstWord);
      if (firstResult) return `${location}, ${firstResult}`;

      // Also try first two words: "Bad Homburg" from "Bad Homburg vor der Höhe"
      if (words.length > 2) {
        const firstTwo = `${words[0]} ${words[1]}`;
        const twoWordResult = lookupCity(firstTwo);
        if (twoWordResult) return `${location}, ${twoWordResult}`;
      }
    }
  }

  // 8. Last resort: try the full cleaned string
  const fullClean = location
    .replace(/\b\d{5}\b/g, "")
    .replace(/^\s*,\s*/, "")
    .trim()
    .toLowerCase();

  if (fullClean && fullClean !== locationLower) {
    const fullResult = lookupCity(fullClean);
    if (fullResult) return `${location}, ${fullResult}`;
  }

  return location; // No match found
}
