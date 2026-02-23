#!/bin/bash

# Script to update PUPPETEER_SERVICE_URL in Supabase after deployment

echo "🔧 Update Puppeteer Service URL in Supabase"
echo "==========================================="
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./update-puppeteer-url.sh <your-deployed-url>"
    echo ""
    echo "Example:"
    echo "  ./update-puppeteer-url.sh https://puppeteer-xing.onrender.com"
    echo ""
    exit 1
fi

DEPLOYED_URL="$1"
SCRAPE_URL="${DEPLOYED_URL}/scrape"

echo "Deployed URL: $DEPLOYED_URL"
echo "Scrape endpoint: $SCRAPE_URL"
echo ""

# Test the health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${DEPLOYED_URL}/health")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Service is healthy!"
    echo "$HEALTH_RESPONSE" | jq '.'
else
    echo "❌ Service health check failed!"
    echo "Response: $HEALTH_RESPONSE"
    echo ""
    echo "Please make sure your service is deployed and accessible."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Service is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Go to Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/settings/functions"
echo ""
echo "2. Add this environment variable:"
echo "   Name:  PUPPETEER_SERVICE_URL"
echo "   Value: $SCRAPE_URL"
echo ""
echo "3. Redeploy the Edge Function (optional, only if secrets weren't auto-applied):"
echo "   npx supabase functions deploy import-rss-jobs"
echo ""
echo "4. Test XING import in your admin dashboard!"
echo ""
