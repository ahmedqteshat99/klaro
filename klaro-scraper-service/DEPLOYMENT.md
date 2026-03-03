# Deployment Guide - Klaro Scraper Service with AI

## Quick Deploy to Railway

### 1. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)
4. Add $5-10 credit to your OpenAI account

### 2. Deploy to Railway

Railway environment variables:

```bash
# Required
OPENAI_API_KEY=sk-proj-your-key-here
SCRAPER_SECRET=your-secret-key-here

# AI Configuration
OPENAI_MODEL=gpt-4o-mini
AI_FALLBACK_ENABLED=true
AI_MAX_CALLS_PER_HOUR=1000

# Optional
LOG_LEVEL=INFO
```

### 3. Deploy Command

```bash
# Build and deploy
railway up
```

### 4. Test Deployment

```bash
# Test with Ethimedis (has AI fallback support)
curl -X POST https://your-railway-url.railway.app/scrape \
  -H "Content-Type: application/json" \
  -H "X-Scraper-Secret: your-secret" \
  -d '{"source": "ethimedis", "max_pages": 2}'
```

### 5. Check AI Stats

```bash
curl https://your-railway-url.railway.app/stats/ai \
  -H "X-Scraper-Secret: your-secret"
```

## Expected Response

```json
{
  "ai_enabled": true,
  "model": "gpt-4o-mini",
  "stats": {
    "attempts": 15,
    "successes": 12,
    "failures": 3,
    "success_rate": 80.0
  },
  "estimated_cost": "$0.0048"
}
```

## Monitoring Costs

- Check usage: https://platform.openai.com/usage
- Set billing limit: https://platform.openai.com/account/billing/limits
- **Recommended limit: $10/month** (plenty for Phase 1)

## Troubleshooting

**No AI fallbacks happening?**
- Check `AI_FALLBACK_ENABLED=true` in Railway
- Check OpenAI API key is valid
- Check logs for "trying AI..." messages

**High costs?**
- Reduce `AI_MAX_CALLS_PER_HOUR`
- Check if caching is enabled
- Review logs for unnecessary AI calls

**API rate limits?**
- Upgrade to OpenAI pay-as-you-go tier
- Reduce concurrent scraping
- Add Redis caching

## Success Indicators

✅ See logs: `[Ethimedis] ✓ AI extracted location: Hamburg`
✅ AI success rate > 70%
✅ Monthly cost < $1
✅ Location coverage > 90%
