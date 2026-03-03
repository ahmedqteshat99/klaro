import logging
import re

from ..models import ScrapedJob
from ..utils.location import extract_city_from_location
from ..utils.text import clean_text, is_junior_position
from .base import BaseScraper

logger = logging.getLogger("klaro-scraper")


class AerzteblattScraper(BaseScraper):
    """Scraper for aerztestellen.aerzteblatt.de job listings."""

    source_name = "aerzteblatt"
    base_url = "https://aerztestellen.aerzteblatt.de/de/stellen/assistenzarzt-arzt-weiterbildung"
    use_stealth = False

    def get_page_url(self, page: int) -> str:
        if page == 1:
            return self.base_url
        return f"{self.base_url}?page={page}"

    def parse_page(self, page) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_links: set[str] = set()

        # Each job is wrapped in <article id="node-XXXXX" class="... node--job ...">
        for article in page.css('article[id^="node-"]'):
            article_id = article.attrib.get("id", "")
            article_class = article.attrib.get("class", "")

            if "node--job" not in article_class:
                continue

            # Extract node ID for fast employer URL resolution
            node_id = article_id.replace("node-", "") if article_id.startswith("node-") else ""

            # Title: from <a class="recruiter-job-link"> inside <h2 class="node__title">
            title_links = article.css("h2.node__title a.recruiter-job-link")
            if not title_links:
                title_links = article.css("h2.node__title a")
            if not title_links:
                continue

            title_link = title_links[0]
            title = clean_text(title_link.attrib.get("title", "") or str(title_link.text))
            if not title:
                continue

            if not is_junior_position(title):
                logger.debug(f"[Aerzteblatt] Skipping non-junior: {title}")
                continue

            link = title_link.attrib.get("href", "")
            if not link or "/de/stelle/" not in link:
                continue

            if link in seen_links:
                continue
            seen_links.add(link)

            # Company: from <span class="recruiter-company-profile-job-organization">
            company = ""
            company_els = article.css(".recruiter-company-profile-job-organization")
            if company_els:
                inner_a = company_els[0].css("a")
                if inner_a:
                    company = clean_text(str(inner_a[0].text))
                else:
                    company = clean_text(str(company_els[0].text))

            # Location: from <div class="location">
            location_els = article.css("div.location")
            raw_location = clean_text(str(location_els[0].text)) if location_els else ""

            # Extract PLZ + City from full address (ignore street prefix)
            location = ""
            if raw_location:
                plz_city_match = re.search(
                    r"(\d{5}\s+[A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\s\-]+)", raw_location
                )
                if plz_city_match:
                    candidate = plz_city_match.group(1).strip()
                    # Extract city, filtering out medical department names
                    location = extract_city_from_location(candidate)
                else:
                    # Extract city from raw location as fallback
                    location = extract_city_from_location(raw_location)

            jobs.append(
                ScrapedJob(
                    title=title,
                    link=link,
                    company=company,
                    location=location,
                    guid=link,
                    node_id=node_id,
                )
            )

        return jobs
