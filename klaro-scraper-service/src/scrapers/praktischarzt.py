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

    def _extract_location_from_listing(self, block) -> str:
        """Extract location from listings page (after .svg-location span)."""
        try:
            # Location appears after <span class="svg-location">...</span>
            # Example HTML: <span class="svg-location">...</span>Kassel</div>
            # Text content: "05.03.2026Kassel" (date and location concatenated)

            employer_address_divs = block.css('.employer-address')
            if not employer_address_divs:
                return ""

            address_text = clean_text(str(employer_address_divs[0].text))
            if not address_text:
                return ""

            # Remove date pattern (DD.MM.YYYY or similar) from the text
            # This leaves us with just the location name
            text_without_date = re.sub(r'\d{2}[\./]\d{2}[\./]\d{4}', '', address_text).strip()

            if not text_without_date or len(text_without_date) < 3:
                return ""

            # Extract city using location utility
            location = extract_city_from_location(text_without_date)
            if location:
                logger.debug(f"[PraktischArzt] Extracted location: {location} from {address_text}")
                return location

            return ""

        except Exception as e:
            logger.warning(f"[PraktischArzt] Failed to extract location from listing: {e}")
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

            # Company: Extract from logo alt attribute or employer-name div
            company = ""
            logo_imgs = block.css('img[id="company_logo_thumb"]')
            if logo_imgs:
                company = logo_imgs[0].attrib.get("alt", "").strip()

            # Fallback: try .employer-name if logo alt is empty
            if not company:
                employer_divs = block.css('.employer-name a')
                if employer_divs:
                    company = clean_text(str(employer_divs[0].text))

            if company:
                logger.debug(f"[PraktischArzt] Extracted company: {company}")

            # Location: Extract from listings page (fast, no additional requests)
            location = self._extract_location_from_listing(block)

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
