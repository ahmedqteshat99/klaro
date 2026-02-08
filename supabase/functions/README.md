# Edge Functions

## Required secrets

Set these in your Supabase project (Dashboard → Project Settings → Edge Functions → Secrets) or via the CLI:

| Secret | Required for | Description |
|--------|----------------|-------------|
| `ANTHROPIC_API_KEY` | extract-job, generate-anschreiben, generate-cv, parse-cv | Anthropic API key for Claude. Required for job extraction, cover letter and CV generation, and CV import. |
| `FIRECRAWL_API_KEY` | extract-job (URL only) | Firecrawl API key for scraping job URLs. **Only needed if users extract job data from a URL.** If this is not set, users can still paste the job ad text or enter data manually. |

## Job extraction (extract-job)

- **URL extraction:** Requires `FIRECRAWL_API_KEY`. If it is not set, the function returns a clear message and the UI suggests pasting the job text or entering data manually.
- **Text extraction:** User can paste the job ad text; no Firecrawl needed. Only `ANTHROPIC_API_KEY` is required.
