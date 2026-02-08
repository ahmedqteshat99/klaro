#!/usr/bin/env bash
# Deploy Edge Functions and list secrets. Run after: npx supabase login

set -e
cd "$(dirname "$0")/.."

echo "Deploying Edge Functions..."
npx supabase functions deploy extract-job
npx supabase functions deploy generate-anschreiben
npx supabase functions deploy generate-cv

echo ""
echo "Done. Current secrets (values are hidden):"
npx supabase secrets list 2>/dev/null || echo "Run 'npx supabase secrets list' to see secrets."
echo ""
echo "To set ANTHROPIC_API_KEY: npx supabase secrets set ANTHROPIC_API_KEY=your_key"
echo "To set FIRECRAWL_API_KEY (optional, for URL extraction): npx supabase secrets set FIRECRAWL_API_KEY=your_key"
