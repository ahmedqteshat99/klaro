"""AI-powered data extraction fallbacks using Claude API."""
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("klaro-scraper")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


async def extract_location_with_ai(
    title: str,
    description: str,
    company: str,
    html_snippet: str = ""
) -> Optional[str]:
    """Use Claude to extract location when CSS selectors fail.

    Args:
        title: Job title
        description: Job description text
        company: Company/hospital name
        html_snippet: Optional HTML snippet for additional context

    Returns:
        Extracted city name (e.g., "Hamburg", "10115 Berlin"), or None if not found
    """
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set, skipping AI location extraction")
        return None

    prompt = f"""Extract the city/location from this German job posting. Return ONLY the city name or postal code + city (e.g., "Hamburg" or "10115 Berlin").

Job Title: {title}
Company: {company}
Description: {description[:500]}

Rules:
1. Return ONLY the city name or PLZ+Stadt
2. Do NOT return medical departments (Innere Medizin, Kardiologie, etc.)
3. Do NOT return hospital types (Klinik, Krankenhaus, etc.)
4. If no city found, return "NONE"
5. No explanation, just the city name

Location:"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5",
                    "max_tokens": 100,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

            if response.status_code != 200:
                logger.error(f"AI location extraction failed: {response.status_code}")
                return None

            data = response.json()
            extracted = data["content"][0]["text"].strip()

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
    """Use Claude to identify employer URL when selector-based extraction fails.

    Args:
        html_content: Full page HTML
        page_url: Current page URL
        source_name: Source identifier (e.g., "stellenmarkt_medizin")

    Returns:
        Extracted employer URL, or None if not found
    """
    if not ANTHROPIC_API_KEY:
        return None

    # Extract all hrefs from HTML
    import re
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html_content)
    unique_hrefs = list(set(hrefs))[:50]  # Limit to 50 unique URLs

    prompt = f"""Find the direct hospital/employer application URL from this list of URLs found on a job aggregator page.

Source: {source_name}
Page URL: {page_url}

URLs found:
{chr(10).join(unique_hrefs)}

Rules:
1. Find URLs that point to hospital/employer career pages or application forms
2. EXCLUDE aggregator domains (stellenmarkt.de, aerzteblatt.de, praktischarzt.de, ethimedis.de)
3. EXCLUDE social media, tracking, ads
4. Prefer URLs with patterns like: /karriere, /jobs, /bewerbung, /apply, /career
5. Return the MOST LIKELY employer URL
6. If none found, return "NONE"
7. Return ONLY the URL, no explanation

Employer URL:"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5",
                    "max_tokens": 200,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

            if response.status_code != 200:
                return None

            data = response.json()
            extracted = data["content"][0]["text"].strip()

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
    """Use Claude to validate and improve extracted job data quality.

    Args:
        job_data: Dict with title, company, location, etc.

    Returns:
        Dict with validation results and corrections: {
            "valid": bool,
            "issues": list[str],
            "corrections": dict
        }
    """
    if not ANTHROPIC_API_KEY:
        return {"valid": True, "issues": [], "corrections": {}}

    prompt = f"""Validate this German medical job posting data. Check for errors and suggest corrections.

Title: {job_data.get('title', 'N/A')}
Company: {job_data.get('company', 'N/A')}
Location: {job_data.get('location', 'N/A')}

Check:
1. Is the location a real German city? (not a medical department)
2. Is the company name reasonable? (not "Unknown" or empty)
3. Is the title a valid medical job title?

Respond in JSON format:
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
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

            if response.status_code != 200:
                return {"valid": True, "issues": [], "corrections": {}}

            data = response.json()
            text = data["content"][0]["text"].strip()

            # Parse JSON response
            import json
            text = text.replace("```json", "").replace("```", "").strip()
            result = json.loads(text)

            return result

    except Exception as e:
        logger.error(f"AI validation error: {e}")
        return {"valid": True, "issues": [], "corrections": {}}
