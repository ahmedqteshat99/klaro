#!/bin/bash

echo "🔍 Checking Edge Function Error..."
echo ""

# The request ID from the error
REQUEST_ID="019c8baa-81f8-7dbb-ba4e-f748b8995c39"

echo "Request ID: $REQUEST_ID"
echo ""
echo "To see detailed logs, go to:"
echo "https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/logs/edge-functions"
echo ""
echo "Look for request ID: $REQUEST_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Common 500 errors:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. PUPPETEER_SERVICE_URL not set"
echo "   → Check: https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/settings/functions"
echo "   → Add secret: PUPPETEER_SERVICE_URL = https://klaro-wse6.onrender.com/scrape"
echo ""
echo "2. Render service not responding"
echo "   → Test health: curl https://klaro-wse6.onrender.com/health"
echo ""
echo "3. Timeout waiting for Render (cold start)"
echo "   → Wait 30-60s for service to wake up"
echo ""

# Test if Render service is accessible
echo "Testing Render service..."
if curl -s --max-time 10 https://klaro-wse6.onrender.com/health | grep -q "ok"; then
    echo "✅ Render service is responding!"
else
    echo "❌ Render service is NOT responding (may be waking up from sleep)"
    echo "   This is normal for free tier - wait 30s and try again"
fi
