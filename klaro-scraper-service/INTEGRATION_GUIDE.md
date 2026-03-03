# AI Integration Guide for Scrapling System

## Overview

This guide shows how to integrate AI models (GPT-4o-mini) to prevent scraping failures and improve data quality.

## 🎯 Failure Points & AI Solutions

### 1. Location Extraction Failures

**Problem:** CSS selectors fail when sites change structure, or location is embedded in text.

**AI Solution:** Use GPT-4o-mini as fallback to extract location from context.

```python
# In scrapers/ethimedis.py (or any scraper)
from ..utils.ai_extraction import extract_location_with_ai

async def parse_html_content_with_ai_fallback(self, html: str) -> list[ScrapedJob]:
    """Parse HTML with AI fallback for missing data."""
    page = Selector(content=html)
    jobs = []

    for block in page.css("[data-jobofferid]"):
        # ... existing extraction logic ...

        # Try CSS selector first
        location = ""
        loc_spans = block.css(".look_text")
        if loc_spans:
            raw_location = clean_text(str(loc_spans[0].text))
            location = extract_city_from_location(raw_location)

        # 🤖 AI FALLBACK: If CSS selector failed, use GPT-4o-mini
        if not location:
            logger.warning(f"Location not found via CSS for job {job_id}, trying AI...")
            description_text = clean_text(str(block.text))[:500]
            location = await extract_location_with_ai(
                title=title,
                description=description_text,
                company=company
            ) or ""

            if location:
                logger.info(f"✓ AI extracted location: {location}")

        jobs.append(ScrapedJob(..., location=location, ...))

    return jobs
```

**Cost Estimation:**
- Model: GPT-4o-mini Haiku 4.5
- Cost: ~$0.0001 per extraction
- 1000 fallback calls = ~$0.10

---

### 2. Employer URL Resolution Failures

**Problem:** CSS selectors can't find the employer URL, or page structure changed.

**AI Solution:** Use GPT-4o-mini to analyze page HTML and identify the most likely employer URL.

```python
# In main.py - resolve_employer_url endpoint
from .utils.ai_extraction import extract_employer_url_with_ai

async def resolve_employer_url(page_url: str, source: str) -> Optional[str]:
    """Resolve employer URL with AI fallback."""

    # Fetch the page
    async with httpx.AsyncClient() as client:
        response = await client.get(page_url, headers={"User-Agent": USER_AGENT})
        html = response.text

    # Try CSS selector approach first (fast)
    page = Selector(content=html)

    if source == "aerzteblatt":
        # Try fast path
        employer_links = page.css("a.apply-button")
        if employer_links:
            return employer_links[0].attrib.get("href")

    # ... other source-specific logic ...

    # 🤖 AI FALLBACK: If selectors fail, use GPT-4o-mini
    logger.warning("Employer URL not found via selectors, trying AI...")
    employer_url = await extract_employer_url_with_ai(
        html_content=html[:10000],  # Limit HTML size for API
        page_url=page_url,
        source_name=source
    )

    if employer_url:
        logger.info(f"✓ AI extracted employer URL: {employer_url}")
        return employer_url

    return None  # Give up
```

**Benefits:**
- Handles site redesigns automatically
- Works even when selectors break
- Learns patterns across different pages

---

### 3. Data Validation & Quality Checks

**Problem:** Extracted data is incomplete, contains errors, or has medical terms in wrong fields.

**AI Solution:** Use GPT-4o-mini to validate and correct extracted data.

```python
# In scrapers/base.py - after extraction
from ..utils.ai_extraction import validate_extracted_data_with_ai

async def scrape_with_validation(self, max_pages: int = 10):
    """Scrape with AI-powered data validation."""
    jobs = []

    # ... scraping logic ...

    for job in raw_jobs:
        # 🤖 AI VALIDATION: Check data quality
        validation = await validate_extracted_data_with_ai({
            "title": job.title,
            "company": job.company,
            "location": job.location,
        })

        if not validation["valid"]:
            logger.warning(f"Job validation failed: {validation['issues']}")

            # Apply AI corrections
            if validation["corrections"].get("location"):
                job.location = validation["corrections"]["location"]
                logger.info(f"✓ AI corrected location: {job.location}")

            if validation["corrections"].get("company"):
                job.company = validation["corrections"]["company"]

        jobs.append(job)

    return jobs
```

---

### 4. Adaptive Selector Generation (Advanced)

**Problem:** Sites change HTML structure, breaking all CSS selectors.

**AI Solution:** Use GPT-4o-mini Vision to analyze screenshots and suggest new selectors.

```python
# New file: utils/adaptive_selectors.py
import base64
from pathlib import Path

async def generate_selectors_from_screenshot(
    screenshot_path: str,
    target_elements: list[str]  # e.g., ["job title", "location", "apply button"]
) -> dict[str, str]:
    """Use GPT-4o-mini Vision to suggest CSS selectors from a screenshot.

    Args:
        screenshot_path: Path to page screenshot
        target_elements: List of elements to find (e.g., ["title", "location"])

    Returns:
        Dict mapping element name to suggested CSS selector
    """
    # Read screenshot
    with open(screenshot_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    prompt = f"""Analyze this job listing page screenshot and suggest CSS selectors for:
{chr(10).join(f"- {elem}" for elem in target_elements)}

For each element, provide:
1. Most specific CSS selector
2. Alternative selector (fallback)
3. Confidence level (1-5)

Respond in JSON format:
{{
  "title": {{"selector": "h2.job-title", "fallback": ".listing h2", "confidence": 5}},
  "location": {{"selector": "span.location", "fallback": ".meta .loc", "confidence": 4}}
}}
"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/messages",
            headers={
                "x-api-key": OPENAI_API_KEY,
                "openai-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "gpt-4o",  # Vision model (gpt-4o supports vision)
                "max_tokens": 1000,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_data
                        }},
                        {"type": "text", "text": prompt}
                    ]
                }],
            },
        )

        data = response.json()
        text = data["content"][0]["text"].strip()

        import json
        selectors = json.loads(text.replace("```json", "").replace("```", ""))
        return selectors

# Usage in scraper:
async def auto_heal_selectors(source: str, page_html: str):
    """Automatically update selectors when they fail."""
    # Take screenshot of page
    screenshot_path = await capture_page_screenshot(page_html)

    # Generate new selectors with AI
    new_selectors = await generate_selectors_from_screenshot(
        screenshot_path,
        target_elements=["job title", "company", "location", "apply url"]
    )

    # Save to config
    with open(f"selectors/{source}.json", "w") as f:
        json.dump(new_selectors, f, indent=2)

    logger.info(f"✓ Auto-healed selectors for {source}")
```

---

## 🚀 Implementation Priority

### Phase 1: Quick Wins (Week 1)
1. ✅ **AI Location Fallback** - Add to all 4 scrapers
2. ✅ **AI URL Resolution Fallback** - Add to `resolve_employer_url`
3. Cost: ~$10-20/month for typical usage

### Phase 2: Quality Improvements (Week 2)
1. **Data Validation** - Run AI validation on all extracted jobs
2. **Confidence Scoring** - AI scores data quality (1-10)
3. Cost: +$20-30/month

### Phase 3: Self-Healing (Month 2)
1. **Adaptive Selectors** - Auto-generate selectors when failures spike
2. **Pattern Learning** - AI learns new site patterns
3. **Monitoring Dashboard** - Track AI intervention rate
4. Cost: +$50/month for vision model usage

---

## 📊 Monitoring & Metrics

Track AI intervention effectiveness:

```python
# Add to job_import_logs table
{
  "ai_interventions": {
    "location_extractions": 15,
    "url_resolutions": 8,
    "validations": 120,
    "selector_healings": 2
  },
  "success_rates": {
    "css_selector": 0.85,
    "ai_fallback": 0.73,
    "combined": 0.95
  },
  "cost_estimate": "$0.23"
}
```

---

## 🔒 Security & Rate Limiting

```python
# Add rate limiting for AI calls
from datetime import datetime, timedelta

class AIRateLimiter:
    def __init__(self, max_calls_per_hour: int = 1000):
        self.max_calls = max_calls_per_hour
        self.calls = []

    async def check_rate_limit(self) -> bool:
        """Check if we're within rate limit."""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)

        # Remove old calls
        self.calls = [c for c in self.calls if c > hour_ago]

        if len(self.calls) >= self.max_calls:
            logger.warning(f"AI rate limit reached: {len(self.calls)}/{self.max_calls}")
            return False

        self.calls.append(now)
        return True

# Global rate limiter
ai_limiter = AIRateLimiter(max_calls_per_hour=1000)

# Use in functions:
async def extract_location_with_ai(...):
    if not await ai_limiter.check_rate_limit():
        return None  # Skip AI if rate limited

    # ... AI call ...
```

---

## 💰 Cost Optimization

1. **Cache AI results** - Store location extractions in Redis
2. **Batch processing** - Group multiple AI calls together
3. **Selective triggering** - Only use AI when CSS fails
4. **Model selection** - Use Haiku for simple tasks, Sonnet for complex

```python
# Example: Caching with Redis
import redis
import hashlib

redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

async def extract_location_with_ai_cached(title: str, description: str, company: str):
    """Extract location with caching."""
    # Create cache key
    cache_key = hashlib.md5(f"{title}:{company}".encode()).hexdigest()

    # Check cache first
    cached = redis_client.get(f"ai_location:{cache_key}")
    if cached:
        logger.debug(f"Location cache hit: {cached}")
        return cached

    # Call AI
    location = await extract_location_with_ai(title, description, company)

    # Cache for 30 days
    if location:
        redis_client.setex(f"ai_location:{cache_key}", 30 * 24 * 3600, location)

    return location
```

**Estimated Monthly Cost with Caching:**
- Without cache: ~$150/month (5000 AI calls/day)
- With cache (80% hit rate): ~$30/month (1000 AI calls/day)

---

## 🧪 Testing AI Integration

```python
# tests/test_ai_extraction.py
import pytest
from src.utils.ai_extraction import extract_location_with_ai

@pytest.mark.asyncio
async def test_location_extraction():
    """Test AI location extraction."""
    location = await extract_location_with_ai(
        title="Assistenzarzt Innere Medizin (m/w/d)",
        description="Wir suchen einen Assistenzarzt für unser Krankenhaus in Hamburg...",
        company="Universitätsklinikum Hamburg-Eppendorf"
    )

    assert location == "Hamburg"

@pytest.mark.asyncio
async def test_location_extraction_with_plz():
    """Test PLZ+Stadt extraction."""
    location = await extract_location_with_ai(
        title="Assistenzarzt Kardiologie",
        description="Klinikum in 10115 Berlin Mitte sucht...",
        company="Charité"
    )

    assert location in ["10115 Berlin", "Berlin"]

@pytest.mark.asyncio
async def test_medical_term_filtering():
    """Ensure medical terms are not returned as locations."""
    location = await extract_location_with_ai(
        title="Assistenzarzt",
        description="Innere Medizin Abteilung sucht Verstärkung...",
        company="Klinikum"
    )

    assert location is None or "innere medizin" not in location.lower()
```

---

## ✅ Next Steps

1. **Create `ai_extraction.py`** - ✅ Done
2. **Add fallback to Ethimedis scraper** - Update `parse_html_content()`
3. **Test with 100 real jobs** - Measure improvement
4. **Deploy to staging** - Monitor cost & performance
5. **Rollout to production** - Phase 1 complete!

Would you like me to implement the integration into the scrapers now?
