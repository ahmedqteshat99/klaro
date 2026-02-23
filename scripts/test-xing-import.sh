#!/bin/bash

# Test XING import via deployed Edge Function
echo "Testing XING import via deployed Edge Function..."
echo ""

cd "$(dirname "$0")/.."

SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '"')
SUPABASE_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d= -f2 | tr -d '"')

# Get user token (this simulates browser request)
echo "Calling Edge Function with user auth..."
echo "URL: ${SUPABASE_URL}/functions/v1/import-rss-jobs"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/import-rss-jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -d '{"sources":["xing"]}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status Code: ${HTTP_CODE}"
echo ""
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Error: Edge Function returned non-200 status code"
  echo ""
  echo "Common issues:"
  echo "1. PUPPETEER_SERVICE_URL not set in production (check Supabase Dashboard > Settings > Edge Functions > Secrets)"
  echo "2. Rate limit is still active (wait 10 minutes or clear logs)"
  echo "3. Authentication failed (check if user is admin)"
  echo ""
  echo "Check logs in Supabase Dashboard:"
  echo "https://supabase.com/dashboard/project/$(grep VITE_SUPABASE_PROJECT_ID .env | cut -d= -f2 | tr -d '"')/logs/edge-functions"
else
  echo "✅ Success!"
fi
