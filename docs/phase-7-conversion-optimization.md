# Phase 7 Conversion Optimization (A/B + Funnel)

## What is now running

1. Landing CTA A/B experiment: `landing_hero_cta_v1`
2. Variants:
   - `auth_first`
   - `jobs_first`
3. CTA and experiment assignment are captured pre-signup and attached to later authenticated events.

## Weekly operating routine

1. Open Admin Dashboard and check:
   - `Landing A/B Conversion (7 Tage)`
   - `Top CTA-Quellen vor Signup (7 Tage)`
   - `Signup -> Versand (7 Tage)`
2. Keep one variant as winner only if:
   - at least 40 signups in both variants, and
   - winner has >= 20% relative lift on signup->send conversion for 2 consecutive weeks.
3. If no clear winner, keep test running and avoid UI changes that invalidate the experiment.

## SQL fallback checks

```sql
-- Signup and send events with experiment metadata
select type, meta, created_at
from public.app_events
where type in ('signup', 'funnel_send_success')
order by created_at desc
limit 200;
```

```sql
-- Failure events for debugging conversion drops
select type, meta, created_at
from public.app_events
where type in ('funnel_prepare_failed', 'funnel_send_failed', 'funnel_reply_failed')
order by created_at desc
limit 200;
```
