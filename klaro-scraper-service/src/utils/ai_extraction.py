"""AI-powered data extraction fallbacks using OpenAI API."""
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("klaro-scraper")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Default to mini for cost efficiency


async def extract_location_with_ai(
    title: str,
    description: str,
    company: str,
    html_snippet: str = ""
) -> Optional[str]:
    """Use OpenAI GPT to extract location when CSS selectors fail.

    Args:
        title: Job title
        description: Job description text
        company: Company/hospital name
        html_snippet: Optional HTML snippet for additional context

    Returns:
        Extracted city name (e.g., "Hamburg", "10115 Berlin"), or None if not found
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set, skipping AI location extraction")
        return None

    system_prompt = """You extract city/location from German job postings.
Rules:
- Return ONLY the city name or PLZ+Stadt (e.g., "Hamburg" or "10115 Berlin")
- Do NOT return medical departments (Innere Medizin, Kardiologie, etc.)
- Do NOT return hospital types (Klinik, Krankenhaus, etc.)
- If no city found, return "NONE"
- No explanation, just the city name"""

    user_prompt = f"""Job Title: {title}
Company: {company}
Description: {description[:500]}

Extract the location:"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 50,
                    "temperature": 0.1,  # Low temperature for consistent extraction
                },
            )

            if response.status_code != 200:
                logger.error(f"AI location extraction failed: {response.status_code}")
                return None

            data = response.json()
            extracted = data["choices"][0]["message"]["content"].strip()

            if extracted and extracted != "NONE" and len(extracted) > 2:
                logger.info(f"AI extracted location: {extracted}")
                return extracted

            return None

    except Exception as e:
        logger.error(f"AI location extraction error: {e}")
        return None


async def extract_employer_url_with_ai(
    html_content: str,
    page_url: str,
    source_name: str
) -> Optional[str]:
    """Use OpenAI GPT to identify employer URL when selector-based extraction fails.

    Args:
        html_content: Full page HTML
        page_url: Current page URL
        source_name: Source identifier (e.g., "stellenmarkt_medizin")

    Returns:
        Extracted employer URL, or None if not found
    """
    if not OPENAI_API_KEY:
        return None

    # Extract all hrefs from HTML
    import re
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html_content)
    unique_hrefs = list(set(hrefs))[:50]  # Limit to 50 unique URLs

    system_prompt = """You identify direct hospital/employer application URLs from job aggregator pages.
Rules:
- Find URLs pointing to hospital/employer career pages or application forms
- EXCLUDE aggregator domains (stellenmarkt.de, aerzteblatt.de, praktischarzt.de, ethimedis.de)
- EXCLUDE social media, tracking, ads
- Prefer URLs with patterns: /karriere, /jobs, /bewerbung, /apply, /career
- Return the MOST LIKELY employer URL
- If none found, return "NONE"
- Return ONLY the URL, no explanation"""

    user_prompt = f"""Source: {source_name}
Page URL: {page_url}

URLs found:
{chr(10).join(unique_hrefs)}

Identify the employer URL:"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 100,
                    "temperature": 0.1,
                },
            )

            if response.status_code != 200:
                return None

            data = response.json()
            extracted = data["choices"][0]["message"]["content"].strip()

            if extracted and extracted != "NONE" and extracted.startswith("http"):
                logger.info(f"AI extracted employer URL: {extracted}")
                return extracted

            return None

    except Exception as e:
        logger.error(f"AI URL extraction error: {e}")
        return None


async def validate_extracted_data_with_ai(
    job_data: dict
) -> dict:
    """Use OpenAI GPT to validate and improve extracted job data quality.

    Args:
        job_data: Dict with title, company, location, etc.

    Returns:
        Dict with validation results and corrections: {
            "valid": bool,
            "issues": list[str],
            "corrections": dict
        }
    """
    if not OPENAI_API_KEY:
        return {"valid": True, "issues": [], "corrections": {}}

    system_prompt = """You validate German medical job posting data and suggest corrections.
Check:
1. Is the location a real German city? (not a medical department)
2. Is the company name reasonable? (not "Unknown" or empty)
3. Is the title a valid medical job title?

Respond in JSON format only."""

    user_prompt = f"""Validate this data:

Title: {job_data.get('title', 'N/A')}
Company: {job_data.get('company', 'N/A')}
Location: {job_data.get('location', 'N/A')}

JSON response:
{{
  "valid": true/false,
  "issues": ["issue 1", "issue 2"],
  "corrections": {{
    "location": "corrected city name or null",
    "company": "corrected name or null"
  }}
}}"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 200,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}  # Force JSON output
                },
            )

            if response.status_code != 200:
                return {"valid": True, "issues": [], "corrections": {}}

            data = response.json()
            text = data["choices"][0]["message"]["content"].strip()

            # Parse JSON response
            import json
            result = json.loads(text)

            return result

    except Exception as e:
        logger.error(f"AI validation error: {e}")
        return {"valid": True, "issues": [], "corrections": {}}
