"""Location validation utilities for filtering out medical department names."""

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

    location_clean = location.strip()
    location_lower = location_clean.lower()

    # If entire string is a medical term, return empty
    if location_lower in MEDICAL_TERMS:
        return ""

    # If location contains delimiters, extract the city part
    for delimiter in [',', '-', '|', '–']:
        if delimiter in location_clean:
            parts = [p.strip() for p in location_clean.split(delimiter)]
            for part in parts:
                part_lower = part.lower().strip()
                # Skip if this part is a medical term
                if part_lower in MEDICAL_TERMS:
                    continue
                # Skip if this part contains a medical term
                contains_medical = any(term in part_lower for term in MEDICAL_TERMS)
                if not contains_medical and len(part) >= 3:
                    return part  # Return the first valid part
            return ""  # All parts were medical terms

    # No delimiters - check if it contains medical terms
    for term in MEDICAL_TERMS:
        if term in location_lower:
            return ""  # Reject locations with medical terms embedded

    return location_clean


def is_valid_location(location: str) -> bool:
    """Check if extracted location is actually a city/region, not a medical term.

    Args:
        location: The extracted location string to validate

    Returns:
        True if the location is valid (not a medical department), False otherwise
    """
    if not location or len(location) < 3:
        return False

    location_lower = location.lower().strip()

    # Reject if the ENTIRE string is exactly a medical term
    if location_lower in MEDICAL_TERMS:
        return False

    # If location contains delimiters, try to extract the city part
    # Common patterns: "City, Klinik" or "PLZ City - Department"
    for delimiter in [',', '-', '|', '–']:
        if delimiter in location:
            parts = [p.strip() for p in location.split(delimiter)]
            for part in parts:
                part_lower = part.lower().strip()
                # Check if this part is a medical term
                if part_lower in MEDICAL_TERMS:
                    continue
                # Check if this part contains a medical term
                contains_medical = any(term in part_lower for term in MEDICAL_TERMS)
                if not contains_medical and len(part) >= 3:
                    # This part looks like a valid location
                    return True
            # All parts were medical terms
            return False

    # No delimiters - check if it contains medical terms
    for term in MEDICAL_TERMS:
        if term in location_lower:
            return False

    return True
