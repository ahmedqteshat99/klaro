#!/bin/bash
# Quick script to run the cleanup function
# Get your anon key from: https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/settings/api

# Replace YOUR_ANON_KEY with your actual anon key
ANON_KEY="YOUR_ANON_KEY_HERE"

if [ "$ANON_KEY" = "YOUR_ANON_KEY_HERE" ]; then
    echo "Please edit this file and add your anon key from:"
    echo "https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/settings/api"
    exit 1
fi

echo "Running cleanup function..."
curl -X POST \
  https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/reactivate-expired-jobs \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  | jq .

echo ""
echo "Done! Check the results above."
