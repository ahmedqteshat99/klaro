# Phase 9 Operations (Scheduler + KPI Guardrails)

## Scope

Phase 9 finalizes production operations for lifecycle campaigns:

1. Automated daily execution (scheduler)
2. KPI guardrails and alert thresholds
3. Weekly tuning routine

## 1) Production scheduler setup

Use any reliable scheduler (Supabase Scheduled Functions, GitHub Actions, cron-job.org, or your server cron) and call the same edge function with different `campaigns` values.

Base endpoint:

`https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner`

Security:

- Send header `x-cron-secret: <LIFECYCLE_RUNNER_SECRET>`
- Use `POST`

Recommended jobs (Europe/Berlin):

1. `daily_job_alert` at 08:00
2. `onboarding_nudge` at 10:00
3. `reactivation` at 11:00

Example request:

```bash
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?campaigns=daily_job_alert&limit=500" \
  -H "x-cron-secret: <LIFECYCLE_RUNNER_SECRET>"
```

## 2) Post-scheduler smoke test

After enabling scheduler jobs, run each campaign once manually:

```bash
# Dry run first
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?campaigns=onboarding_nudge&dryRun=true&limit=20&secret=<LIFECYCLE_RUNNER_SECRET>"

# Real run
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner?campaigns=onboarding_nudge&limit=20&secret=<LIFECYCLE_RUNNER_SECRET>"
```

Repeat for `reactivation` and `daily_job_alert`.

## 3) KPI guardrails

Check these daily in Admin Dashboard:

1. `Lifecycle Zustellrate (7 Tage)` should stay >= `95%`
2. `Lifecycle E-Mails (24h) fehlgeschlagen` should stay close to `0`
3. `Lifecycle Queue (24h)` should not grow continuously
4. `Lifecycle Performance je Kampagne (7 Tage)` should show stable sent/failure patterns

## 4) SQL fallback checks

```sql
-- Delivery health by campaign (7 days)
select
  campaign_type,
  status,
  count(*) as total
from public.lifecycle_email_logs
where created_at >= now() - interval '7 days'
group by 1,2
order by 1,2;
```

```sql
-- Latest failures
select
  campaign_type,
  recipient_email,
  error_message,
  created_at
from public.lifecycle_email_logs
where status = 'failed'
order by created_at desc
limit 100;
```

```sql
-- Rows stuck in queued state for more than 30 minutes
select
  id,
  campaign_type,
  recipient_email,
  created_at
from public.lifecycle_email_logs
where status = 'queued'
  and created_at < now() - interval '30 minutes'
order by created_at asc
limit 200;
```

## 5) Weekly tuning routine

1. Reduce `limit` if failures spike (provider throttling/temporary errors).
2. Increase `limit` if queue remains healthy and user base grows.
3. Keep `reactivation` conservative (every 14+ days per user is already enforced).
4. Review opt-out behavior in `user_notification_preferences` before increasing volume.
5. Update email copy only after monitoring trend impact for at least one week.

## 6) Incident response quick flow

1. Pause scheduler jobs if failure rate spikes.
2. Inspect latest failed rows and error messages.
3. Verify Mailgun account health and domain reputation.
4. Run one campaign manually with `limit=10` to validate recovery.
5. Resume scheduler jobs when send success is stable again.
