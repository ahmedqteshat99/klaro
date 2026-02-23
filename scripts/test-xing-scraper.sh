#!/bin/bash

# Test script for XING scraper via Puppeteer service
# Usage: ./scripts/test-xing-scraper.sh

echo "🧪 Testing XING Scraper via Puppeteer Service"
echo "=============================================="
echo ""

# Check if service is running
echo "1. Checking if Puppeteer service is running..."
HEALTH_CHECK=$(curl -s http://localhost:3001/health)

if [ $? -ne 0 ]; then
    echo "❌ Puppeteer service is not running!"
    echo ""
    echo "Please start it first:"
    echo "  cd scripts && npm install && npm start"
    exit 1
fi

echo "✅ Service is running: $HEALTH_CHECK"
echo ""

# Test scraping XING
echo "2. Testing XING scraping (this may take 30-60 seconds)..."
echo "   URL: https://www.xing.com/jobs/search?keywords=assistenzarzt&location=Deutschland"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.xing.com/jobs/search?keywords=assistenzarzt&location=Deutschland",
    "timeout": 60000,
    "waitForSelector": "article, .job-card, [data-testid=\"job-card\"]"
  }')

# Check if response contains error
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Scraping failed!"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

# Extract some stats
HTML_LENGTH=$(echo "$RESPONSE" | jq -r '.html' | wc -c)
FINAL_URL=$(echo "$RESPONSE" | jq -r '.url')

echo "✅ Scraping successful!"
echo ""
echo "Stats:"
echo "  • HTML size: $HTML_LENGTH bytes"
echo "  • Final URL: $FINAL_URL"
echo ""

# Check if HTML contains job-related content
if echo "$RESPONSE" | jq -r '.html' | grep -qi "assistenzarzt"; then
    echo "✅ HTML contains 'assistenzarzt' - likely found jobs!"
else
    echo "⚠️  HTML does not contain 'assistenzarzt' - may need to adjust selector"
fi

if echo "$RESPONSE" | jq -r '.html' | grep -qi "cloudflare\|challenge"; then
    echo "❌ Cloudflare challenge detected - may need better stealth"
else
    echo "✅ No Cloudflare challenge detected"
fi

echo ""
echo "🎉 Test complete!"
echo ""
echo "Next steps:"
echo "  1. Set PUPPETEER_SERVICE_URL in your .env:"
echo "     PUPPETEER_SERVICE_URL=http://localhost:3001/scrape"
echo ""
echo "  2. Test the full import function:"
echo "     supabase functions serve import-rss-jobs"
echo ""
