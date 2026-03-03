import asyncio
import logging
from abc import ABC, abstractmethod

from scrapling import Fetcher, StealthyFetcher

from ..config import PAGE_DELAY, USER_AGENT, ACCEPT_HTML, ACCEPT_LANGUAGE, REQUEST_TIMEOUT
from ..models import ScrapedJob

logger = logging.getLogger("klaro-scraper")


class BaseScraper(ABC):
    """Abstract base class for all job board scrapers."""

    source_name: str
    base_url: str
    use_stealth: bool = False

    @abstractmethod
    def get_page_url(self, page: int) -> str:
        """Build the URL for a given page number."""
        ...

    @abstractmethod
    def parse_page(self, page) -> list[ScrapedJob]:
        """Parse a Scrapling response page into a list of ScrapedJob."""
        ...

    def _get_fetcher(self):
        """Return the appropriate Scrapling fetcher instance."""
        if self.use_stealth:
            return StealthyFetcher()
        return Fetcher()

    async def scrape(self, max_pages: int = 100) -> tuple[list[ScrapedJob], int, list[str]]:
        """
        Scrape all pages up to max_pages.
        Returns (jobs, pages_scraped, errors).
        """
        all_jobs: list[ScrapedJob] = []
        seen_guids: set[str] = set()
        errors: list[str] = []
        pages_scraped = 0
        fetcher = self._get_fetcher()

        for page_num in range(1, max_pages + 1):
            url = self.get_page_url(page_num)

            try:
                response = fetcher.get(
                    url,
                    stealthy_headers={
                        "User-Agent": USER_AGENT,
                        "Accept": ACCEPT_HTML,
                        "Accept-Language": ACCEPT_LANGUAGE,
                    },
                )

                if response.status != 200:
                    logger.warning(
                        f"[{self.source_name}] Page {page_num} returned {response.status}, stopping"
                    )
                    break

                jobs = self.parse_page(response)
                pages_scraped += 1

                logger.info(f"[{self.source_name}] Page {page_num}: found {len(jobs)} jobs")

                for job in jobs:
                    if job.guid not in seen_guids:
                        seen_guids.add(job.guid)
                        all_jobs.append(job)

                # No jobs found on this page — end of results
                if len(jobs) == 0:
                    break

                # Polite delay between pages
                if page_num < max_pages:
                    await asyncio.sleep(PAGE_DELAY)

            except Exception as e:
                msg = f"Page {page_num} error: {str(e)}"
                logger.error(f"[{self.source_name}] {msg}")
                errors.append(msg)
                break

        logger.info(
            f"[{self.source_name}] Scrape complete: {len(all_jobs)} jobs from {pages_scraped} pages"
        )
        return all_jobs, pages_scraped, errors
