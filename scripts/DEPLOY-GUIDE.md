# 🚀 Deploy Puppeteer Service to Cloud

Your Puppeteer service needs to be publicly accessible for production XING imports.

## ✅ Files Ready for Deployment

All deployment files have been created:
- ✅ `Dockerfile` - Container configuration
- ✅ `railway.json` - Railway configuration
- ✅ `.dockerignore` - Ignore unnecessary files

---

## Option 1: Railway (Recommended - Free Tier Available)

### Step 1: Login to Railway
```bash
cd /Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main/scripts
railway login
```
This will open your browser to authenticate.

### Step 2: Initialize Project
```bash
railway init
```
Choose "Create new project" and give it a name like "puppeteer-xing-scraper"

### Step 3: Deploy
```bash
railway up
```

### Step 4: Get Public URL
```bash
railway domain
```
This will generate a public URL like `https://puppeteer-xing-scraper-production.up.railway.app`

### Step 5: Add to Supabase
1. Go to https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/settings/functions
2. Add environment variable:
   - **Name**: `PUPPETEER_SERVICE_URL`
   - **Value**: `https://your-railway-app.railway.app/scrape`

---

## Option 2: Render (Easiest - Web UI)

### Step 1: Create Render Account
Go to https://render.com and sign up (free tier available)

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository or use "Deploy from Docker"
3. If using Docker:
   - **Docker Image Path**: Upload or connect the scripts folder
   - **Region**: Choose closest to your users
   - **Instance Type**: Free

### Step 3: Environment
No environment variables needed for the service itself

### Step 4: Deploy
Click "Create Web Service" - Render will build and deploy automatically

### Step 5: Get URL
After deployment, you'll get a URL like: `https://puppeteer-xing.onrender.com`

### Step 6: Add to Supabase
Add `https://puppeteer-xing.onrender.com/scrape` to Supabase as `PUPPETEER_SERVICE_URL`

---

## Option 3: Quick Deploy to Render (Manual Upload)

### Step 1: Create render.yaml
Already created! The file is in the scripts folder.

### Step 2: Push to GitHub
```bash
cd /Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main
git add scripts/
git commit -m "Add Puppeteer service deployment files"
git push
```

### Step 3: Deploy from GitHub
1. Go to https://dashboard.render.com/select-repo
2. Connect your repository
3. Select the repository
4. Render will auto-detect the Docker configuration
5. Click "Create Web Service"

---

## 🔧 After Deployment

### Test Your Deployed Service
```bash
# Replace with your actual URL
curl https://your-app-url.com/health
# Should return: {"status":"ok","service":"puppeteer-scraper"}

# Test scraping
curl -X POST https://your-app-url.com/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.xing.com/jobs/search?keywords=assistenzarzt","timeout":60000}' \
  | jq '.html' | grep -i assistenzarzt | wc -l
# Should return a number > 0
```

### Update Supabase Environment Variable

**Important**: Don't forget this step!

1. Go to: https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/settings/functions
2. Click "Add Secret"
3. Add:
   - **Name**: `PUPPETEER_SERVICE_URL`
   - **Value**: `https://your-deployed-url.com/scrape` (your actual deployment URL + /scrape)

### Redeploy Edge Function (if needed)
```bash
cd /Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main
npx supabase functions deploy import-rss-jobs
```

The Edge Function will now use the new PUPPETEER_SERVICE_URL from Supabase secrets.

---

## 💰 Pricing Notes

- **Railway**: 500 hours/month free, then $5/month for hobby plan
- **Render**: Free tier available (sleeps after 15min inactivity, takes ~30s to wake)
- **Fly.io**: $1.94/month minimum

**Recommendation**: Start with Render's free tier. If the cold start delay is annoying, upgrade to Railway's hobby plan.

---

## 🐛 Troubleshooting

### Service won't start
- Check logs in dashboard (Railway/Render/Fly.io)
- Ensure Dockerfile is using correct Node version
- Make sure puppeteer-service.js exists

### XING import still not working
- Verify PUPPETEER_SERVICE_URL is set in Supabase
- Test the /health endpoint: `curl https://your-url.com/health`
- Check Edge Function logs in Supabase dashboard

### Memory issues
- Default Render free tier: 512MB
- Puppeteer needs at least 512MB
- If issues, upgrade to paid tier with more memory

---

## ✅ Success Checklist

- [ ] Puppeteer service deployed and accessible
- [ ] `/health` endpoint returns `{"status":"ok"}`
- [ ] PUPPETEER_SERVICE_URL set in Supabase secrets
- [ ] Edge Function redeployed (if needed)
- [ ] XING import button works in admin dashboard
- [ ] Blue XING badges appear on imported jobs

Once all checkboxes are complete, your XING integration is production-ready! 🎉
