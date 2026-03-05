import json
import logging
import re

from ..models import ScrapedJob
from ..utils.location import extract_city_from_location
from ..utils.text import clean_text, is_junior_position
from .base import BaseScraper

logger = logging.getLogger("klaro-scraper")


class PraktischArztScraper(BaseScraper):
    """Scraper for praktischarzt.de Assistenzarzt listings."""

    source_name = "praktischarzt"
    base_url = "https://www.praktischarzt.de/assistenzarzt/"
    use_stealth = False  # Standard Fetcher — PraktischArzt is static HTML

    def get_page_url(self, page: int) -> str:
        if page == 1:
            return self.base_url
        return f"{self.base_url}{page}/"

    def _extract_location_from_job_page(self, job_url: str) -> str:
        """Fetch individual job page and extract location from JSON-LD."""
        try:
            # Fetch the job detail page
            response = self.fetcher.fetch(job_url)
            if not response or not response.text:
                return ""

            html = response.text

            # Look for JSON-LD with JobPosting schema
            json_ld_pattern = r'<script type="application/ld\+json">(.*?)</script>'
            matches = re.findall(json_ld_pattern, html, re.DOTALL)

            for match in matches:
                try:
                    data = json.loads(match)
                    # Check if it's a JobPosting
                    if data.get('@type') == 'JobPosting':
                        # Extract location from jobLocation.address.addressLocality
                        job_location = data.get('jobLocation', {})
                        if isinstance(job_location, dict):
                            address = job_location.get('address', {})
                            if isinstance(address, dict):
                                locality = address.get('addressLocality', '').strip()
                                if locality:
                                    logger.debug(f"[PraktischArzt] Extracted location from JSON-LD: {locality}")
                                    return locality
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.debug(f"[PraktischArzt] Failed to parse JSON-LD: {e}")
                    continue

            logger.debug(f"[PraktischArzt] No location found in JSON-LD for {job_url}")
            return ""

        except Exception as e:
            logger.warning(f"[PraktischArzt] Failed to fetch job page {job_url}: {e}")
            return ""

    def parse_page(self, page) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_links: set[str] = set()

        # Each job block: <div id="job-XXXXX" class="... box-job ...">
        for block in page.css('div[id^="job-"].box-job'):
            # Job URL: <a href="https://www.praktischarzt.de/job/SLUG/">
            link_els = block.css('a[href*="praktischarzt.de/job/"]')
            if not link_els:
                continue

            link = link_els[0].attrib.get("href", "")
            if not link:
                continue

            if link in seen_links:
                continue

            # Title: <a class="title-link title desktop_show">
            title_els = block.css("a.title-link.desktop_show")
            if not title_els:
                title_els = block.css("a.title-link")
            title = clean_text(str(title_els[0].text)) if title_els else ""
            if not title:
                continue

            if not is_junior_position(title):
                logger.debug(f"[PraktischArzt] Skipping non-junior: {title}")
                continue

            seen_links.add(link)

            # Company: Extract from logo alt attribute (HTML structure changed)
            company = ""
            logo_imgs = block.css('img[id="company_logo_thumb"]')
            if logo_imgs:
                company = logo_imgs[0].attrib.get("alt", "").strip()
                if company:
                    logger.debug(f"[PraktischArzt] Extracted company from logo: {company}")

            # Location: Must be fetched from individual job page (not on listings page)
            # This will slow down scraping but ensures complete data
            location = self._extract_location_from_job_page(link)

            jobs.append(
                ScrapedJob(
                    title=title,
                    link=link,
                    company=company,
                    location=location,
                    guid=link,
                )
            )

        return jobs
