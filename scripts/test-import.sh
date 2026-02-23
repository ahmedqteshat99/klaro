#!/bin/bash

echo "🧪 Testing RSS Import Function"
echo "================================"
echo ""

# Get Supabase URL and keys from .env
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
fi

# Check if Puppeteer service is running
echo "1. Checking Puppeteer service..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "   ✅ Puppeteer service is running"
else
  echo "   ❌ Puppeteer service is NOT running"
  echo "   Start it: cd scripts && npm start"
  echo ""
fi

# Trigger import (adjust URL based on your setup)
echo ""
echo "2. Triggering import function..."
echo "   (This will take 30-60 seconds...)"
echo ""

# Use local Supabase if available, otherwise use hosted
if command -v supabase &> /dev/null; then
  FUNCTION_URL="http://localhost:54321/functions/v1/import-rss-jobs"
else
  FUNCTION_URL="${SUPABASE_URL}/functions/v1/import-rss-jobs"
fi

RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET:-test-secret}")

echo ""
echo "3. Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "4. Summary:"
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
TOTAL=$(echo "$RESPONSE" | jq -r '.totalListings // 0')
IMPORTED=$(echo "$RESPONSE" | jq -r '.imported // 0')
UPDATED=$(echo "$RESPONSE" | jq -r '.updated // 0')
SKIPPED=$(echo "$RESPONSE" | jq -r '.skipped // 0')
ERRORS=$(echo "$RESPONSE" | jq -r '.errors // 0')

if [ "$SUCCESS" = "true" ]; then
  echo "   ✅ Import completed successfully"
  echo "   📊 Statistics:"
  echo "      • Total listings scraped: $TOTAL"
  echo "      • New jobs imported: $IMPORTED"
  echo "      • Existing jobs updated: $UPDATED"
  echo "      • Jobs skipped (unchanged): $SKIPPED"
  echo "      • Errors: $ERRORS"

  if [ "$IMPORTED" -eq "0" ] && [ "$UPDATED" -eq "0" ]; then
    echo ""
    echo "   ⚠️  No new jobs imported or updated!"
    echo ""
    echo "   Possible reasons:"
    echo "   1. All jobs already exist in database (high skip count)"
    echo "   2. No jobs found from sources (check totalListings)"
    echo "   3. Import failed with errors (check error count)"
    echo ""
    echo "   To force fresh import, run in Supabase SQL editor:"
    echo "   DELETE FROM jobs WHERE rss_feed_source IS NOT NULL;"
  fi
else
  echo "   ❌ Import failed"
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
  echo "   Error: $ERROR"
fi

echo ""
echo "Done!"
