# Edge Functions

## Required secrets

Set these in your Supabase project (Dashboard → Project Settings → Edge Functions → Secrets) or via the CLI:

| Secret | Required for | Description |
|--------|----------------|-------------|
| `ANTHROPIC_API_KEY` | extract-job, generate-anschreiben, generate-cv, parse-cv | Anthropic API key for Claude. Required for job extraction, cover letter and CV generation, and CV import. |
| `FIRECRAWL_API_KEY` | extract-job (URL only) | Firecrawl API key for scraping job URLs. **Only needed if users extract job data from a URL.** If this is not set, users can still paste the job ad text or enter data manually. |
| `MAILGUN_API_KEY` | send-application-email, reply-application-email, mailgun-inbound | Mailgun API key for sending outbound emails and forwarding inbound replies. |
| `MAILGUN_API_BASE_URL` | send-application-email, reply-application-email, mailgun-inbound | Mailgun API base URL. EU accounts use `https://api.eu.mailgun.net`, US accounts use `https://api.mailgun.net`. |
| `MAILGUN_DOMAIN` | send-application-email, reply-application-email, mailgun-inbound | Mailgun sending domain, e.g. `klaro.tools`. |
| `MAILGUN_FROM_EMAIL` | send-application-email, reply-application-email, mailgun-inbound | Sender email address, e.g. `bewerbungen@klaro.tools`. |
| `MAILGUN_FROM_NAME` | send-application-email, reply-application-email, mailgun-inbound | Sender display name, e.g. `Klaro Bewerbungen`. |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | mailgun-inbound | Mailgun HTTP webhook signing key for verifying inbound requests. |
| `MAILGUN_INBOUND_WEBHOOK_URL` | send-application-email, reply-application-email | Optional explicit URL for Mailgun route forwarding. Defaults to `<SUPABASE_URL>/functions/v1/mailgun-inbound`. |
| `PUBLIC_SITE_URL` | lifecycle-campaign-runner | Public app URL used in lifecycle emails (example: `https://klaro.tools`). |
| `LIFECYCLE_RUNNER_SECRET` | lifecycle-campaign-runner | Secret used by cron/manual calls (`x-cron-secret` header or `?secret=` query). |

## Job extraction (extract-job)

- **URL extraction:** Requires `FIRECRAWL_API_KEY`. If it is not set, the function returns a clear message and the UI suggests pasting the job text or entering data manually.
- **Text extraction:** User can paste the job ad text; no Firecrawl needed. Only `ANTHROPIC_API_KEY` is required.

## Lifecycle campaigns (lifecycle-campaign-runner)

This function sends lifecycle emails for:

- `onboarding_nudge`
- `reactivation`
- `daily_job_alert`

Run examples:

```bash
# Dry run all campaigns
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?dryRun=true&secret=<LIFECYCLE_RUNNER_SECRET>"

# Run only reactivation (max 100 users)
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?campaigns=reactivation&limit=100&secret=<LIFECYCLE_RUNNER_SECRET>"
```
