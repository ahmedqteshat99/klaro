import logging
import re

from ..models import ScrapedJob
from ..utils.location import extract_city_from_location
from ..utils.text import clean_text, is_junior_position
from .base import BaseScraper

logger = logging.getLogger("klaro-scraper")


class StellenmarktScraper(BaseScraper):
    """Scraper for stellenmarkt.de Assistenzarzt listings."""

    source_name = "stellenmarkt_medizin"
    base_url = "https://www.stellenmarkt.de/stellenangebote--Assistenzarzt"
    use_stealth = False

    def get_page_url(self, page: int) -> str:
        if page == 1:
            return self.base_url
        return f"{self.base_url}?page={page}"

    def parse_page(self, page) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_links: set[str] = set()

        # Find all job listing links: <a href="/anzeige[ID].html">
        for link_el in page.css('a[href^="/anzeige"][href$=".html"]'):
            href = link_el.attrib.get("href", "")
            if not href or not re.match(r"/anzeige\d+\.html", href):
                continue

            full_link = f"https://www.stellenmarkt.de{href}"
            if full_link in seen_links:
                continue

            # Title: prefer the title attribute, fall back to <h2> text
            title_attr = link_el.attrib.get("title", "")
            if title_attr.startswith("Stellenangebot "):
                title_attr = title_attr[len("Stellenangebot "):]
            title_attr = clean_text(title_attr)

            h2_els = link_el.css("h2")
            title_h2 = clean_text(h2_els[0].text) if h2_els else ""

            title = title_attr if len(title_attr) > len(title_h2) else title_h2
            if not title:
                continue

            if not is_junior_position(title):
                logger.debug(f"[Stellenmarkt] Skipping non-junior: {title}")
                continue

            seen_links.add(full_link)

            # Extract company and location from surrounding context
            company = ""
            location = ""

            parent = link_el.parent
            if parent is not None:
                context = parent.parent if parent.parent is not None else parent

                # Company: <a title="Stellenangebote von COMPANY">
                company_els = context.css('a[title^="Stellenangebote von"]')
                if company_els:
                    company_title = company_els[0].attrib.get("title", "")
                    company = clean_text(company_title.replace("Stellenangebote von ", ""))

                # Location: <i class="fas fa-map-marker-alt"></i> followed by text
                loc_icons = context.css("i.fa-map-marker-alt")
                if loc_icons and loc_icons[0].parent:
                    parent_text = loc_icons[0].parent.text
                    raw_location = clean_text(str(parent_text))
                    # Extract city, filtering out medical department names
                    location = extract_city_from_location(raw_location)

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
