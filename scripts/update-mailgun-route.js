#!/usr/bin/env node

/**
 * Update existing Mailgun route to catch ALL emails
 */

const https = require('https');

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const ROUTE_ID = '698babde4e711e47029d1d69'; // Your existing route ID
const SUPABASE_FUNCTION_URL = 'https://sfmgdvjwmoxoeqmcarbv.functions.supabase.co/mailgun-inbound';

if (!MAILGUN_API_KEY) {
  console.error('❌ Error: MAILGUN_API_KEY not found');
  process.exit(1);
}

console.log('🔄 Updating Mailgun route to catch ALL emails...');

const routeData = new URLSearchParams();
routeData.append('priority', '0');
routeData.append('description', 'Forward all emails to Supabase for smart routing');
routeData.append('expression', 'match_recipient(".*@klaro.tools")');
routeData.append('action', `forward("${SUPABASE_FUNCTION_URL}")`);
routeData.append('action', 'stop()');

const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

const options = {
  hostname: 'api.mailgun.net',
  path: `/v3/routes/${ROUTE_ID}`,
  method: 'PUT',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': routeData.toString().length,
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('\n✅ Route updated successfully!');
      console.log(`📍 Route ID: ${response.route.id}`);
      console.log(`🎯 Expression: ${response.route.expression}`);
      console.log(`📬 Actions: ${response.route.actions.join(', ')}`);
      console.log('\n🎉 Your route now catches ALL emails to klaro.tools!');
      console.log('\nYou can now use:');
      console.log('  • reply+anything@klaro.tools → handled by your app');
      console.log('  • linkedin@klaro.tools → forwarded to personal email');
      console.log('  • twitter@klaro.tools → forwarded to personal email');
      console.log('  • anything@klaro.tools → forwarded to personal email');
    } else {
      console.error(`\n❌ Failed to update route (Status: ${res.statusCode})`);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(routeData.toString());
req.end();
