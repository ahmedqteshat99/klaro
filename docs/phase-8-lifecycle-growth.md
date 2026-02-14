# Phase 8 Lifecycle Growth (Email Loops)

## What was added

1. `user_notification_preferences` table (per-user toggles + last sent timestamps).
2. `lifecycle_email_logs` table (audit + dedupe + delivery status).
3. Edge Function `lifecycle-campaign-runner` for:
   - onboarding nudges
   - reactivation emails
   - daily job alerts

## Deploy checklist

1. Run DB migration:
   - `supabase db push`
2. Set secrets:
   - `supabase secrets set PUBLIC_SITE_URL=https://klaro.tools`
   - `supabase secrets set LIFECYCLE_RUNNER_SECRET=<strong-random-secret>`
3. Deploy function:
   - `supabase functions deploy lifecycle-campaign-runner`

## Run examples

```bash
# Dry run (no emails sent)
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?dryRun=true&secret=<LIFECYCLE_RUNNER_SECRET>"

# Run all campaigns
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?secret=<LIFECYCLE_RUNNER_SECRET>"

# Run one campaign with cap
curl -X POST "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?campaigns=daily_job_alert&limit=200&secret=<LIFECYCLE_RUNNER_SECRET>"
```

## Scheduling suggestion

1. `daily_job_alert`: every day at 08:00.
2. `onboarding_nudge`: every day at 10:00.
3. `reactivation`: every day at 11:00.

Use different scheduler jobs pointing to the same function with different `campaigns=` query param.

## Monitoring SQL

```sql
select campaign_type, status, count(*) as total
from public.lifecycle_email_logs
where created_at >= now() - interval '7 days'
group by 1,2
order by 1,2;
```

```sql
select campaign_type, recipient_email, status, error_message, created_at
from public.lifecycle_email_logs
order by created_at desc
limit 100;
```
