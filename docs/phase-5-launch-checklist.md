# Phase 5 Launch Checklist (SEO + Indexing)

## 1) Technical checks

- Confirm `https://klaro.tools/robots.txt` is publicly reachable.
- Confirm `https://klaro.tools/sitemap.xml` is publicly reachable.
- Run `npm run sitemap:generate` locally and verify job detail URLs are present.
- Deploy and re-check both URLs on production.

## 2) Google Search Console

- Add/verify `klaro.tools` as a **Domain property**.
- Submit sitemap URL: `https://klaro.tools/sitemap.xml`.
- Use URL Inspection for:
  - `/`
  - `/jobs`
  - one real job detail URL from sitemap.
- Request indexing for those URLs.

## 3) Bing Webmaster Tools

- Add/verify `klaro.tools`.
- Submit sitemap URL: `https://klaro.tools/sitemap.xml`.
- Validate crawl status and indexing coverage after first crawl.

## 4) Post-launch monitoring (first 14 days)

- Check Search Console indexing and crawl errors every 48 hours.
- Track impressions/clicks for `/jobs` and job detail pages.
- Fix URLs excluded for technical reasons (robots, 404, canonical conflicts).
- Keep publishing jobs daily to maintain crawl frequency and freshness.
