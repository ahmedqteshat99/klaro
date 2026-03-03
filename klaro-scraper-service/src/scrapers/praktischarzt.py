import logging

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

            # Company: <div class="employer-name"> contains <a>
            company = ""
            company_els = block.css(".employer-name a")
            if company_els:
                company = clean_text(str(company_els[0].text))

            # Location: after <span class="svg-location">
            location = ""
            loc_spans = block.css(".svg-location")
            if loc_spans and loc_spans[0].parent:
                parent_text = loc_spans[0].parent.text
                raw_location = clean_text(str(parent_text))
                # Extract city, filtering out medical department names
                location = extract_city_from_location(raw_location)

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
