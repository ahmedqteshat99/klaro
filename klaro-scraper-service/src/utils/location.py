"""Location validation utilities for filtering out medical department names."""

import re

# Medical terms and generic hospital terms that appear as locations but shouldn't
MEDICAL_TERMS = {
    # Medical departments
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
    # Generic hospital/clinic terms
    "klinik",
    "klinikum",
    "krankenhaus",
    "hospital",
    "praxis",
    "medizinisches zentrum",
    "gesundheitszentrum",
}

GENERIC_PREFIX_PATTERN = re.compile(
    r"^(?:standort|location|ort)\s*:?\s*|"
    r"^(?:klinik(?:um)?|krankenhaus|hospital|praxis|medizinisches zentrum|"
    r"gesundheitszentrum|universitätsklinikum|universitaetsklinikum)\s+",
    re.IGNORECASE,
)

PLZ_CITY_PATTERN = re.compile(
    r"\b(\d{5}\s+[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\s\-]{1,80})\b"
)


def _clean_location_part(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" ,;|")


def extract_city_from_location(location: str) -> str:
    """Extract the city part from a location string that may contain medical terms.

    Examples:
        "Hamburg, Klinik" → "Hamburg"
        "10115 Berlin - Innere Medizin" → "10115 Berlin"
        "Klinik" → ""

    Args:
        location: The raw location string

    Returns:
        The extracted city name, or empty string if no valid city found
    """
    if not location or len(location) < 3:
        return ""

    location_clean = _clean_location_part(location)
    location_lower = location_clean.lower()

    # If entire string is a medical term, return empty
    if location_lower in MEDICAL_TERMS:
        return ""

    plz_match = PLZ_CITY_PATTERN.search(location_clean)
    if plz_match:
        candidate = _clean_location_part(plz_match.group(1))
        candidate_lower = candidate.lower()
        if not any(term in candidate_lower for term in MEDICAL_TERMS):
            return candidate

    # If location contains delimiters, extract the city part
    for delimiter in [',', '-', '|', '–']:
        if delimiter in location_clean:
            parts = [_clean_location_part(p) for p in location_clean.split(delimiter)]
            for part in parts:
                if not part:
                    continue

                part = _clean_location_part(GENERIC_PREFIX_PATTERN.sub("", part))
                part_lower = part.lower().strip()
                # Skip if this part is a medical term
                if part_lower in MEDICAL_TERMS:
                    continue
                # Skip if this part contains a medical term
                contains_medical = any(term in part_lower for term in MEDICAL_TERMS)
                if not contains_medical and len(part) >= 3:
                    return part  # Return the first valid part
            return ""  # All parts were medical terms

    stripped = _clean_location_part(GENERIC_PREFIX_PATTERN.sub("", location_clean))
    if stripped and stripped != location_clean:
        stripped_lower = stripped.lower()
        if not any(term in stripped_lower for term in MEDICAL_TERMS):
            return stripped

    # No delimiters - check if it contains medical terms
    for term in MEDICAL_TERMS:
        if term in location_lower:
            return ""  # Reject locations with medical terms embedded

    return stripped or location_clean


def is_valid_location(location: str) -> bool:
    """Check if extracted location is actually a city/region, not a medical term.

    Args:
        location: The extracted location string to validate

    Returns:
        True if the location is valid (not a medical department), False otherwise
    """
    return bool(extract_city_from_location(location))
