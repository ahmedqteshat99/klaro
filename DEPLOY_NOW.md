# 🚀 DEPLOY NOW - Final Steps Before Launch

**All code changes are complete!** Follow these steps to deploy:

---

## ✅ COMPLETED

- ✅ Privacy policy updated (DatenschutzPage.tsx)
- ✅ Email opt-in logic fixed (lifecycle-campaign-runner)
- ✅ Unsubscribe links added to all emails
- ✅ Email preferences UI component created and integrated
- ✅ Database migration created

---

## 🔴 STEP 1: Apply Database Migration (5 minutes)

### Option A: Using Supabase CLI (Recommended)

```bash
cd /Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main

# Push migration to database
supabase db push
```

### Option B: Manual via Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New query"
5. Copy/paste entire content from:
   `supabase/migrations/20260213_email_opt_in_compliance.sql`
6. Click "Run" (bottom right)
7. Should see: "Success. No rows returned"

### ✅ Verify Migration Worked

Run this query in SQL Editor:

```sql
-- Check that preferences table has defaults set to FALSE
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE onboarding_nudges_enabled = TRUE) as onboarding_opted_in,
  COUNT(*) FILTER (WHERE reactivation_emails_enabled = TRUE) as reactivation_opted_in,
  COUNT(*) FILTER (WHERE job_alerts_enabled = TRUE) as job_alerts_opted_in
FROM user_notification_preferences;
```

**Expected result:**
- If you have existing users, all three "opted_in" columns should be **0**
- This confirms users are opted-out by default ✅

---

## 🔴 STEP 2: Deploy Edge Functions (10 minutes)

The `lifecycle-campaign-runner` function was updated with opt-in logic and unsubscribe links.

```bash
cd /Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main

# Deploy all edge functions
./scripts/deploy-edge-functions.sh

# OR deploy just the updated one:
supabase functions deploy lifecycle-campaign-runner
```

**What this does:**
- Deploys updated email campaign logic
- New emails will include unsubscribe links
- Only opted-in users will receive emails

---

## 🔴 STEP 3: Deploy Frontend (15 minutes)

### Build and Deploy

```bash
cd /Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main

# Install dependencies (if needed)
npm install

# Build production bundle
npm run build

# Deploy to your hosting platform
# (Instructions depend on your hosting - see below)
```

### Hosting Platform Instructions

**If using Vercel:**
```bash
vercel --prod
```

**If using Netlify:**
```bash
netlify deploy --prod
```

**If using other hosting:**
- Upload contents of `dist/` folder to your web server
- Ensure routing is configured for SPA (all routes → index.html)

---

## 🔴 STEP 4: Test Everything (10 minutes)

### Test Checklist

1. **Privacy Policy**
   - [ ] Visit: https://your-domain.com/datenschutz
   - [ ] Verify Section 6 says "Nutzungsanalyse und Verbesserung"
   - [ ] Verify Section 7 says "E-Mail-Benachrichtigungen"
   - [ ] No false claims about "keine Analytics"

2. **Email Preferences UI**
   - [ ] Sign up as new test user
   - [ ] Go to Profile page (https://your-domain.com/profil)
   - [ ] Scroll down to "E-Mail Benachrichtigungen" card
   - [ ] All three toggles should be **OFF** by default ✅
   - [ ] Toggle one ON, save, refresh → should stay ON

3. **Database Verification**
   ```sql
   -- Replace <test-user-id> with your test user's ID
   SELECT * FROM user_notification_preferences
   WHERE user_id = '<test-user-id>';

   -- Should show all three fields as FALSE initially
   ```

4. **Email Campaign Test (Optional)**
   - [ ] Manually trigger campaign (see command below)
   - [ ] Verify 0 emails sent (because all opted out)
   - [ ] Enable one preference for test user
   - [ ] Re-trigger campaign
   - [ ] Check email inbox for message with unsubscribe link

### Manual Campaign Trigger Command

```bash
# Replace with your Supabase project details
curl -X POST "https://<your-project-ref>.supabase.co/functions/v1/lifecycle-campaign-runner" \
  -H "Authorization: Bearer <your-service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"campaigns": ["onboarding_nudge"], "dryRun": true, "limitPerCampaign": 5}'

# Look for in response: "would_send": 0 (if all opted out)
```

---

## ✅ LAUNCH CHECKLIST

Before announcing your launch:

- [ ] Database migration applied successfully
- [ ] Edge functions deployed
- [ ] Frontend deployed and accessible
- [ ] Privacy policy shows updated sections
- [ ] Email preferences UI visible on profile page
- [ ] Test user created with all preferences defaulted to FALSE
- [ ] Unsubscribe links present in test emails

---

## 📊 MONITORING (First 24 Hours)

### What to Watch

1. **Email Campaigns**
   ```sql
   -- Check lifecycle email logs
   SELECT
     campaign_type,
     COUNT(*) as total_attempts,
     COUNT(*) FILTER (WHERE status = 'sent') as sent,
     COUNT(*) FILTER (WHERE status = 'skipped') as skipped
   FROM lifecycle_email_logs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY campaign_type;

   -- Expected: "skipped" should be high (users opted out)
   -- Expected: "sent" should be low or 0 (until users opt in)
   ```

2. **User Opt-In Rate**
   ```sql
   -- Track how many users enable notifications
   SELECT
     COUNT(*) as total_users_with_prefs,
     COUNT(*) FILTER (WHERE job_alerts_enabled = TRUE) as job_alerts_opted_in,
     ROUND(100.0 * COUNT(*) FILTER (WHERE job_alerts_enabled = TRUE) / COUNT(*), 1) as opt_in_percentage
   FROM user_notification_preferences;
   ```

3. **Profile Page Views**
   ```sql
   -- Check if users are finding the preferences
   SELECT COUNT(*) FROM app_events
   WHERE event_type = 'profile_view'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

---

## 🆘 TROUBLESHOOTING

### Issue: "Migration already applied" error

**Solution:** The migration has a unique filename. If you get this error, it means it was already run. Check:
```sql
SELECT * FROM _supabase_migrations
WHERE name LIKE '%email_opt_in%';
```

### Issue: Email preferences card not showing

**Checklist:**
- [ ] Component imported in ProfilPage.tsx? (line 32)
- [ ] Component added to JSX? (after PublicationsForm)
- [ ] No console errors in browser?
- [ ] Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: Users still receiving emails

**Debugging:**
1. Check database:
   ```sql
   SELECT user_id, onboarding_nudges_enabled, reactivation_emails_enabled, job_alerts_enabled
   FROM user_notification_preferences
   WHERE user_id = '<user-id>';
   ```

2. Check edge function deployed:
   ```bash
   supabase functions list
   # Should show lifecycle-campaign-runner with recent "Created at" timestamp
   ```

3. Check function logs:
   - Go to Supabase Dashboard → Edge Functions → lifecycle-campaign-runner → Logs
   - Look for "would_send" or "sent" counts

---

## 📞 QUICK REFERENCE

### Key Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/DatenschutzPage.tsx` | Sections 6-8 rewritten | Accurate privacy disclosures |
| `supabase/functions/lifecycle-campaign-runner/index.ts` | Line 187 + email templates | Opt-in logic + unsubscribe links |
| `src/components/profile/EmailNotificationPreferences.tsx` | New file | User preferences UI |
| `src/pages/ProfilPage.tsx` | Import + component added | Integrates preferences into profile |
| `supabase/migrations/20260213_email_opt_in_compliance.sql` | New file | Database defaults to FALSE |

### Environment Variables Needed

Make sure these are set in Supabase:

- `MAILGUN_API_KEY` - For sending emails
- `MAILGUN_DOMAIN` - Your domain (e.g., klaro.tools)
- `ANTHROPIC_API_KEY` - For CV/cover letter generation
- `PUBLIC_SITE_URL` - Your website URL (for unsubscribe links)

---

## 🎉 YOU'RE READY TO LAUNCH!

Once all 4 steps above are complete, you're legally compliant and ready to announce.

### Post-Launch To-Do (Week 1)

1. **Day 3:** Implement cookie consent banner (Klaro library)
2. **Day 5:** Fix account deletion to include applications
3. **Day 7:** Review first week's email metrics and user feedback

---

**Questions?** Check LAUNCH_TODAY_CHECKLIST.md for detailed legal context.

**Good luck! 🚀**
