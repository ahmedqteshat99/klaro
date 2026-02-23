# Re-enable Rate Limit

After testing, uncomment the rate limit code in:
`supabase/functions/import-rss-jobs/index.ts` around line 708

Change this:
```typescript
// TEMPORARILY DISABLED FOR TESTING - Re-enable for production!
// if (lastRun) {
//     const lastRunAge = Date.now() - new Date(lastRun.created_at).getTime();
//     if (lastRunAge < 10 * 60 * 1000) { // 10 minute cooldown
```

Back to this:
```typescript
if (lastRun) {
    const lastRunAge = Date.now() - new Date(lastRun.created_at).getTime();
    if (lastRunAge < 10 * 60 * 1000) { // 10 minute cooldown
```

This prevents hammering the job sites with too many requests.
