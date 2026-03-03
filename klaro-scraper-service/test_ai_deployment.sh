#!/bin/bash
# Test AI-enhanced Ethimedis scraper

# Configuration
RAILWAY_URL="https://klaro-scraper-production.up.railway.app"  # Replace with your Railway URL
SCRAPER_SECRET="your-scraper-secret"  # Replace with your actual secret

echo "🧪 Testing AI-Enhanced Ethimedis Scraper"
echo "=========================================="
echo ""

echo "📡 Sending request to $RAILWAY_URL/scrape..."
echo ""

# Test scrape with Ethimedis (has AI fallback)
RESPONSE=$(curl -s -X POST "$RAILWAY_URL/scrape" \
  -H "Content-Type: application/json" \
  -H "X-Scraper-Secret: $SCRAPER_SECRET" \
  -d '{
    "source": "ethimedis",
    "max_pages": 3
  }')

echo "📊 Response:"
echo "$RESPONSE" | python3 -m json.tool

echo ""
echo "✅ Check Railway logs for:"
echo "  - [Ethimedis] Location not found via CSS, trying AI..."
echo "  - [Ethimedis] ✓ AI extracted location: Hamburg"
echo "  - [Ethimedis] AI Fallback Stats: X/Y successful (Z%)"
echo ""
echo "💰 Monitor costs at: https://platform.openai.com/usage"
