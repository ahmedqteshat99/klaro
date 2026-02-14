# Phase 6 Growth Ops (Traffic + Conversion)

## 1) Submit and verify indexing

1. Open Google Search Console and add/verify `klaro.tools` as a Domain property.
2. Submit sitemap: `https://klaro.tools/sitemap.xml`.
3. Inspect and request indexing for:
   - `https://klaro.tools/`
   - `https://klaro.tools/jobs`
   - one live job detail URL from sitemap.
4. Repeat the same in Bing Webmaster Tools.

## 2) Validate production tracking

1. Visit the site with UTM params, for example:
   - `https://klaro.tools/jobs?utm_source=linkedin&utm_medium=organic&utm_campaign=launch`
2. Continue to signup/login and complete one test application send.
3. In Supabase SQL, validate attribution and funnel events:

```sql
select type, meta, created_at
from public.app_events
where type in (
  'signup',
  'login',
  'funnel_apply_click',
  'funnel_prepare_start',
  'funnel_prepare_success',
  'funnel_send_success',
  'funnel_reply_success',
  'onboarding_complete'
)
order by created_at desc
limit 50;
```

## 3) Weekly KPI checks

1. Open Admin Dashboard and monitor:
   - Signup volume (24h/7d)
   - Sent applications (24h/7d)
   - Inbound replies (7d)
   - Signup-to-send conversion (7d)
   - Top signup sources (7d)
2. If conversion drops, inspect recent funnel failure events:

```sql
select type, meta, created_at
from public.app_events
where type in ('funnel_prepare_failed', 'funnel_send_failed', 'funnel_reply_failed')
order by created_at desc
limit 100;
```
