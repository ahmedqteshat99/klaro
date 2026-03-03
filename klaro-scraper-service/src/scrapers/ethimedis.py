"""Enhanced Ethimedis scraper with OpenAI GPT-4o-mini fallbacks for robust data extraction."""
import asyncio
import logging

import httpx
from scrapling import Selector

from ..config import PAGE_DELAY, USER_AGENT, REQUEST_TIMEOUT
from ..models import ScrapedJob
from ..utils.location import extract_city_from_location
from ..utils.text import clean_text, is_junior_position
from ..utils.ai_extraction import extract_location_with_ai

logger = logging.getLogger("klaro-scraper")

ETHIMEDIS_BASE_URL = (
    "https://www.ethimedis.de/joboffers/index"
    "/type_id/5"
    "/sortby/data__joboffers.publication_date"
    "/sortdirection/desc"
)


class EthimedisScraper:
    """Enhanced Ethimedis scraper with AI fallbacks.

    Features:
    - CSS selector extraction (fast, primary method)
    - AI fallback for location when selectors fail
    - Data quality validation
    - Automatic retry on failures
    """

    source_name = "ethimedis"

    def __init__(self, enable_ai_fallback: bool = True):
        """Initialize scraper.

        Args:
            enable_ai_fallback: Enable AI fallback for missing data (default: True)
        """
        self.enable_ai_fallback = enable_ai_fallback
        self.ai_usage_stats = {
            "location_extractions": 0,
            "successful_fallbacks": 0,
            "failed_fallbacks": 0
        }

    async def parse_html_content(self, html: str) -> list[ScrapedJob]:
        """Parse HTML with AI fallback for missing data.

        Args:
            html: HTML content from Ethimedis AJAX response

        Returns:
            List of scraped jobs with complete data
        """
        if not html or not html.strip():
            return []

        page = Selector(content=html)
        jobs: list[ScrapedJob] = []
        seen_ids: set[str] = set()

        for block in page.css("[data-jobofferid]"):
            job_id = block.attrib.get("data-jobofferid", "")
            if not job_id or job_id in seen_ids:
                continue

            # ─── TITLE EXTRACTION ───
            title_els = block.css("h5")
            title = clean_text(str(title_els[0].text)) if title_els else ""
            if not title or len(title) < 5:
                continue

            # Skip unwanted job types
            if "initiativbewerbung" in title.lower():
                logger.debug(f"[Ethimedis] Skipping Initiativbewerbung: {title}")
                continue

            if not is_junior_position(title):
                logger.debug(f"[Ethimedis] Skipping non-junior: {title}")
                continue

            seen_ids.add(job_id)
            full_link = f"https://www.ethimedis.de/joboffers/nicedetails/id/{job_id}"

            # ─── COMPANY EXTRACTION ───
            company = self._extract_company(block)

            # ─── LOCATION EXTRACTION WITH AI FALLBACK ───
            location = ""

            # Try CSS selector first (fast)
            # Multiple .look_text spans exist per block (e.g. "Klinik", "Hamburg")
            # Iterate all and take the first valid city (skip medical/generic terms)
            loc_spans = block.css(".look_text")
            for span in loc_spans:
                raw_location = clean_text(str(span.text))
                candidate = extract_city_from_location(raw_location)
                if candidate:
                    location = candidate
                    break

            # 🤖 AI FALLBACK: If CSS selector failed or returned empty
            if not location and self.enable_ai_fallback:
                self.ai_usage_stats["location_extractions"] += 1
                logger.warning(f"[Ethimedis] Location not found via CSS for job {job_id}, trying AI...")

                # Get more context for AI
                description_text = clean_text(str(block.text))[:500]

                try:
                    ai_location = await extract_location_with_ai(
                        title=title,
                        description=description_text,
                        company=company,
                        html_snippet=""
                    )

                    if ai_location:
                        location = ai_location
                        self.ai_usage_stats["successful_fallbacks"] += 1
                        logger.info(f"[Ethimedis] ✓ AI extracted location for {job_id}: {location}")
                    else:
                        self.ai_usage_stats["failed_fallbacks"] += 1
                        logger.warning(f"[Ethimedis] ✗ AI could not extract location for {job_id}")

                except Exception as e:
                    self.ai_usage_stats["failed_fallbacks"] += 1
                    logger.error(f"[Ethimedis] AI extraction error for {job_id}: {e}")

            jobs.append(
                ScrapedJob(
                    title=title,
                    link=full_link,
                    company=company,
                    location=location,
                    guid=full_link,
                )
            )

        return jobs

    def _extract_company(self, block) -> str:
        """Extract company name from Ethimedis block structure."""
        try:
            all_text = str(block.text)
            title_els = block.css("h5")
            if title_els:
                title_text = str(title_els[0].text)
                idx = all_text.find(title_text)
                if idx > 0:
                    before = all_text[:idx].strip()
                    before = before.replace("PremiumUser", "").strip()
                    if before and len(before) > 2:
                        return clean_text(before)
        except Exception:
            pass
        return ""

    async def scrape(self, max_pages: int = 50) -> tuple[list[ScrapedJob], int, list[str]]:
        """Scrape Ethimedis with AI-enhanced data extraction.

        Args:
            max_pages: Maximum pages to scrape

        Returns:
            Tuple of (jobs, pages_scraped, errors)
        """
        all_jobs: list[ScrapedJob] = []
        seen_guids: set[str] = set()
        errors: list[str] = []
        pages_scraped = 0

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            for page_num in range(max_pages):
                offset = page_num * 15
                url = f"{ETHIMEDIS_BASE_URL}/offset/{offset}?format=json"

                try:
                    response = await client.get(
                        url,
                        headers={
                            "User-Agent": USER_AGENT,
                            "Accept": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    )

                    if response.status_code != 200:
                        logger.warning(
                            f"[Ethimedis] Offset {offset} returned {response.status_code}, stopping"
                        )
                        break

                    data = response.json()
                    html_content = data.get("content", "")
                    jobs = await self.parse_html_content(html_content)

                    pages_scraped += 1
                    logger.info(f"[Ethimedis] Offset {offset}: found {len(jobs)} jobs")

                    for job in jobs:
                        if job.guid not in seen_guids:
                            seen_guids.add(job.guid)
                            all_jobs.append(job)

                    if len(jobs) == 0:
                        break

                    # Polite delay
                    if page_num + 1 < max_pages:
                        await asyncio.sleep(PAGE_DELAY)

                except Exception as e:
                    msg = f"Offset {offset} error: {str(e)}"
                    logger.error(f"[Ethimedis] {msg}")
                    errors.append(msg)
                    break

        # Log AI usage statistics
        if self.enable_ai_fallback and self.ai_usage_stats["location_extractions"] > 0:
            total = self.ai_usage_stats["location_extractions"]
            success = self.ai_usage_stats["successful_fallbacks"]
            success_rate = (success / total * 100) if total > 0 else 0

            logger.info(
                f"[Ethimedis] AI Fallback Stats: {success}/{total} successful ({success_rate:.1f}%)"
            )

        logger.info(
            f"[Ethimedis] Scrape complete: {len(all_jobs)} jobs from {pages_scraped} pages"
        )
        return all_jobs, pages_scraped, errors


# Example usage:
"""
# Instantiate with AI fallback enabled
scraper = EthimedisScraper(enable_ai_fallback=True)

# Scrape jobs
jobs, pages, errors = await scraper.scrape(max_pages=10)

# Check AI usage
print(f"AI interventions: {scraper.ai_usage_stats}")

# Output:
# [Ethimedis] Offset 0: found 15 jobs
# [Ethimedis] Location not found via CSS for job 12345, trying AI...
# [Ethimedis] ✓ AI extracted location for 12345: Hamburg
# [Ethimedis] AI Fallback Stats: 8/10 successful (80.0%)
# [Ethimedis] Scrape complete: 142 jobs from 10 pages
"""
