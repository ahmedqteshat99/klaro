#!/bin/bash

echo "🔍 Debugging Edge Function Issue"
echo "=================================="
echo ""

# The runId from the error
RUN_ID="run_1771870062438_1o4ha0"

echo "Run ID: $RUN_ID"
echo ""
echo "Issue: totalListings=0 but Render is scraping successfully"
echo ""
echo "Possible causes:"
echo "1. Edge Function timeout before Render responds"
echo "2. Parser not finding jobs in HTML"
echo "3. Browser scraper not being called"
echo ""
echo "To debug, check Supabase logs:"
echo "https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/logs/edge-functions"
echo ""
echo "Search for runId: $RUN_ID"
echo ""
echo "Look for these log messages:"
echo "- 'Browser scraping page 1'"
echo "- 'Page 1: found X jobs'"
echo "- Any error messages"
echo ""
