import os


SCRAPER_SECRET = os.environ.get("SCRAPER_SECRET", "")
PORT = int(os.environ.get("PORT", "8000"))

# Polite scraping delays (seconds)
PAGE_DELAY = 1.5
EMPLOYER_URL_TIMEOUT = 8.0

# HTTP settings
USER_AGENT = "Mozilla/5.0 (compatible; KlaroBot/1.0)"
ACCEPT_HTML = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
ACCEPT_LANGUAGE = "de-DE,de;q=0.9,en;q=0.5"
REQUEST_TIMEOUT = 30.0
