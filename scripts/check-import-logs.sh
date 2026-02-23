#!/bin/bash

# Simple script to check recent import logs
echo "Checking recent XING imports..."
echo ""

cd "$(dirname "$0")/.."

# Use curl to call Supabase REST API
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d= -f2 | tr -d '"')
SUPABASE_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d= -f2 | tr -d '"')

# Get recent import logs
curl -s "${SUPABASE_URL}/rest/v1/job_import_logs?order=created_at.desc&limit=5" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  | jq -r '.[] | "\(.created_at): \(.action) - \(.details | tostring)"'

echo ""
echo "Counting XING jobs..."

# Count XING jobs
curl -s "${SUPABASE_URL}/rest/v1/jobs?rss_feed_source=eq.xing&select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Prefer: count=exact" \
  | jq -r 'if . == [] then "0 XING jobs found" else "\(length) XING jobs in database" end'
