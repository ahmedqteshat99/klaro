import asyncio
import logging

import httpx
from fastapi import FastAPI, Header, HTTPException
from scrapling import Selector

from .config import SCRAPER_SECRET, USER_AGENT, EMPLOYER_URL_TIMEOUT
from .models import (
    ScrapeRequest,
    ScrapeResponse,
    ResolveUrlRequest,
    ResolveUrlResponse,
    CheckLinksRequest,
    CheckLinksResponse,
    LinkCheckResult,
)
from .scrapers.stellenmarkt import StellenmarktScraper
from .scrapers.aerzteblatt import AerzteblattScraper
from .scrapers.praktischarzt import PraktischArztScraper
from .scrapers.ethimedis import EthimedisScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("klaro-scraper")

app = FastAPI(title="Klaro Scraper Service", version="1.0.0")

# Registry of available scrapers
SCRAPERS = {
    "stellenmarkt_medizin": StellenmarktScraper,
    "aerzteblatt": AerzteblattScraper,
    "praktischarzt": PraktischArztScraper,
    "ethimedis": EthimedisScraper,
}

# Aggregator domains to skip when resolving employer URLs
AGGREGATOR_DOMAINS = [
    "stellenmarkt.de",
    "aerzteblatt.de",
    "praktischarzt.de",
    "ethimedis.de",
    "medi-jobs.de",
    "jobvector.de",
    "aerztezeitung.de",
    "anzeigenvorschau.net",
]


def _verify_secret(x_scraper_secret: str | None):
    """Verify the shared secret for authentication."""
    if SCRAPER_SECRET and x_scraper_secret != SCRAPER_SECRET:
        raise HTTPException(status_code=401, detail="Invalid scraper secret")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "klaro-scraper", "sources": list(SCRAPERS.keys())}


@app.get("/scrape/sources")
async def list_sources(x_scraper_secret: str | None = Header(None)):
    _verify_secret(x_scraper_secret)
    return {
        "sources": [
            {"name": name, "type": "stealth" if getattr(cls, "use_stealth", False) else "basic"}
            for name, cls in SCRAPERS.items()
        ]
    }


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest, x_scraper_secret: str | None = Header(None)):
    _verify_secret(x_scraper_secret)

    if request.source not in SCRAPERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source: {request.source}. Available: {list(SCRAPERS.keys())}",
        )

    scraper_cls = SCRAPERS[request.source]
    scraper = scraper_cls()

    logger.info(f"Starting scrape: source={request.source}, max_pages={request.max_pages}")

    jobs, pages_scraped, errors = await scraper.scrape(max_pages=request.max_pages)

    logger.info(
        f"Scrape complete: source={request.source}, jobs={len(jobs)}, "
        f"pages={pages_scraped}, errors={len(errors)}"
    )

    return ScrapeResponse(
        success=len(errors) == 0 or len(jobs) > 0,
        source=request.source,
        jobs=jobs,
        pages_scraped=pages_scraped,
        errors=errors,
    )


@app.post("/scrape/resolve-employer-url", response_model=ResolveUrlResponse)
async def resolve_employer_url(
    request: ResolveUrlRequest, x_scraper_secret: str | None = Header(None)
):
    """Resolve redirect chains to find the employer's direct application URL."""
    _verify_secret(x_scraper_secret)

    # Aerzteblatt fast path: resolve via node ID
    if request.source == "aerzteblatt" and request.node_id:
        url, hops = await _resolve_aerzteblatt_url(request.node_id)
        return ResolveUrlResponse(employer_url=url, hops=hops)

    # Generic: fetch job page and find "Bewerben" links
    url = await _resolve_generic_employer_url(request.job_url)
    return ResolveUrlResponse(employer_url=url, hops=1 if url else 0)


async def _resolve_aerzteblatt_url(node_id: str) -> tuple[str | None, int]:
    """Resolve Aerzteblatt employer URL via node ID redirect chain."""
    apply_url = f"https://aerztestellen.aerzteblatt.de/de/node/{node_id}/apply-external"
    skip_domains = ["aerzteblatt.de", "anzeigenvorschau.net"]
    max_hops = 3
    current_url = apply_url
    hops = 0

    async with httpx.AsyncClient(timeout=EMPLOYER_URL_TIMEOUT) as client:
        for _ in range(max_hops):
            try:
                resp = await client.get(
                    current_url,
                    headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
                    follow_redirects=False,
                )
                hops += 1

                location = resp.headers.get("location")
                if not location:
                    # No more redirects - check if current URL is valid
                    if current_url != apply_url:
                        # We've moved away from the initial redirect
                        try:
                            parsed = httpx.URL(current_url)
                            final_domain = parsed.host or ""
                            # Accept if the FINAL domain is not an aggregator
                            if not any(d in final_domain for d in skip_domains):
                                return current_url, hops
                        except Exception:
                            pass
                    return None, hops

                if location.startswith("http"):
                    next_url = location
                else:
                    next_url = str(httpx.URL(current_url).join(location))

                # Check if next URL's domain is an aggregator
                try:
                    next_domain = httpx.URL(next_url).host or ""
                    if not any(d in next_domain for d in skip_domains):
                        return next_url, hops + 1
                except Exception:
                    pass

                current_url = next_url
            except Exception:
                return None, hops

    # Final check after all redirects
    try:
        final_domain = httpx.URL(current_url).host or ""
        if not any(d in final_domain for d in skip_domains):
            return current_url, hops
    except Exception:
        pass
    return None, hops


async def _resolve_generic_employer_url(job_page_url: str) -> str | None:
    """Fetch a job detail page and extract the employer's direct application URL."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                job_page_url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
                },
            )

            if resp.status_code != 200:
                return None

            page = Selector(content=resp.text)

            # Strategy 1: "Jetzt bewerben" links
            for a in page.css("a"):
                text = str(a.text).strip().lower() if a.text else ""
                if "bewerben" not in text:
                    continue
                href = a.attrib.get("href", "")
                if _is_valid_employer_url(href):
                    return href

            # Strategy 2: PraktischArzt apply button
            for a in page.css("a.apply_job_button"):
                href = a.attrib.get("href", "")
                if _is_valid_employer_url(href):
                    return href

            # Strategy 3: Aerzteblatt apply-external redirect
            for a in page.css('a[href*="/apply-external"]'):
                href = a.attrib.get("href", "")
                if "/de/node/" in href and "/apply-external" in href:
                    redirect_url = str(httpx.URL(job_page_url).join(href))
                    try:
                        redirect_resp = await client.get(
                            redirect_url,
                            headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
                            follow_redirects=False,
                        )
                        location = redirect_resp.headers.get("location")
                        if location and location.startswith("http"):
                            if not any(d in location for d in AGGREGATOR_DOMAINS):
                                return location
                    except Exception:
                        pass

            return None
    except Exception:
        return None


def _is_valid_employer_url(href: str) -> bool:
    """Check if a URL is a valid employer URL (not mailto, not aggregator, etc.)."""
    if not href or not href.startswith("http"):
        return False
    # Extract domain from URL and check if FINAL destination is an aggregator
    # This allows URLs that redirect THROUGH aggregators but end at employer domains
    try:
        domain = httpx.URL(href).host or ""
        # Reject ONLY if the final destination domain is an aggregator
        return not any(agg_domain in domain for agg_domain in AGGREGATOR_DOMAINS)
    except Exception:
        return False


# ─── Link Health Checking ──────────────────────────────────────────

# German phrases indicating a job posting has been removed/filled (page returns 200 but job is gone)
REMOVAL_MARKERS = [
    "nicht mehr verfügbar",
    "nicht mehr aktiv",
    "stelle ist besetzt",
    "position besetzt",
    "anzeige abgelaufen",
    "anzeige ist nicht mehr",
    "stellenangebot wurde entfernt",
    "seite nicht gefunden",
    "diese stelle existiert nicht",
    "leider ist diese stelle",
    "stellenanzeige nicht gefunden",
    "job not found",
    "page not found",
]

LINK_CHECK_TIMEOUT = 12.0
LINK_CHECK_CONCURRENCY = 10  # Max concurrent requests
LINK_CHECK_DELAY = 0.3  # Polite delay between batches


async def _check_single_link(client: httpx.AsyncClient, item_id: str, url: str) -> LinkCheckResult:
    """Check a single URL and return its health status."""
    try:
        resp = await client.get(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
            },
            follow_redirects=True,
        )

        status_code = resp.status_code

        # 404/410 → stale (job removed)
        if status_code in (404, 410):
            return LinkCheckResult(
                id=item_id, url=url, status="stale",
                http_status=status_code, reason=str(status_code),
            )

        # 5xx → server error (may be temporary)
        if 500 <= status_code < 600:
            return LinkCheckResult(
                id=item_id, url=url, status="error",
                http_status=status_code, reason=f"server_error_{status_code}",
            )

        # 2xx/3xx → check content for removal markers
        if 200 <= status_code < 400:
            body_lower = resp.text.lower() if resp.text else ""

            # Check for "position filled" markers in page content
            for marker in REMOVAL_MARKERS:
                if marker in body_lower:
                    # Verify it's not just in a navigation menu or footer
                    # by checking if it appears in the main content area
                    marker_idx = body_lower.find(marker)
                    # Only flag if marker appears in first 5000 chars (main content, not deep footer)
                    if marker_idx < 5000:
                        return LinkCheckResult(
                            id=item_id, url=url, status="stale",
                            http_status=status_code, reason="position_filled",
                        )

            return LinkCheckResult(
                id=item_id, url=url, status="active",
                http_status=status_code, reason=None,
            )

        # Other status codes
        return LinkCheckResult(
            id=item_id, url=url, status="unknown",
            http_status=status_code, reason=f"unexpected_{status_code}",
        )

    except httpx.TimeoutException:
        return LinkCheckResult(
            id=item_id, url=url, status="unknown",
            http_status=None, reason="timeout",
        )
    except Exception as e:
        return LinkCheckResult(
            id=item_id, url=url, status="error",
            http_status=None, reason=f"fetch_error: {str(e)[:100]}",
        )


@app.post("/scrape/check-links", response_model=CheckLinksResponse)
async def check_links(
    request: CheckLinksRequest, x_scraper_secret: str | None = Header(None)
):
    """Batch-check job URLs for health status using content-aware detection."""
    _verify_secret(x_scraper_secret)

    if len(request.urls) > 200:
        raise HTTPException(status_code=400, detail="Max 200 URLs per request")

    logger.info(f"Checking {len(request.urls)} links")

    results: list[LinkCheckResult] = []

    async with httpx.AsyncClient(timeout=LINK_CHECK_TIMEOUT) as client:
        # Process in batches to avoid overwhelming targets
        for i in range(0, len(request.urls), LINK_CHECK_CONCURRENCY):
            batch = request.urls[i : i + LINK_CHECK_CONCURRENCY]
            batch_results = await asyncio.gather(
                *[_check_single_link(client, item.id, item.url) for item in batch],
            )
            results.extend(batch_results)

            # Polite delay between batches
            if i + LINK_CHECK_CONCURRENCY < len(request.urls):
                await asyncio.sleep(LINK_CHECK_DELAY)

    active = sum(1 for r in results if r.status == "active")
    stale = sum(1 for r in results if r.status == "stale")
    errors = sum(1 for r in results if r.status == "error")
    logger.info(
        f"Link check complete: {len(results)} checked, "
        f"{active} active, {stale} stale, {errors} errors"
    )

    return CheckLinksResponse(results=results)
