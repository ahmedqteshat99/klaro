from pydantic import BaseModel
from typing import Optional


class ScrapedJob(BaseModel):
    title: str
    link: str
    company: str
    location: str
    guid: str
    employer_url: Optional[str] = None
    node_id: Optional[str] = None  # Aerzteblatt-specific


class ScrapeRequest(BaseModel):
    source: str  # "stellenmarkt_medizin" | "aerzteblatt" | "praktischarzt" | "ethimedis"
    max_pages: int = 100


class ScrapeResponse(BaseModel):
    success: bool
    source: str
    jobs: list[ScrapedJob]
    pages_scraped: int
    errors: list[str] = []


class ResolveUrlRequest(BaseModel):
    job_url: str
    source: str
    node_id: Optional[str] = None  # For Aerzteblatt fast path


class ResolveUrlResponse(BaseModel):
    employer_url: Optional[str] = None
    hops: int = 0


class LinkCheckItem(BaseModel):
    id: str
    url: str
    source: str = ""


class CheckLinksRequest(BaseModel):
    urls: list[LinkCheckItem]


class LinkCheckResult(BaseModel):
    id: str
    url: str
    status: str  # "active" | "stale" | "error" | "unknown"
    http_status: Optional[int] = None
    reason: Optional[str] = None  # "404", "position_filled", "page_removed", etc.


class CheckLinksResponse(BaseModel):
    results: list[LinkCheckResult]
