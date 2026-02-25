#!/usr/bin/env node

/**
 * Mailgun Route Setup Script
 * Creates an inbound email route to forward all emails from klaro.tools
 */

const https = require('https');

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = 'klaro.tools';
const FORWARD_TO_EMAIL = process.env.FORWARD_TO_EMAIL;

if (!MAILGUN_API_KEY) {
  console.error('❌ Error: MAILGUN_API_KEY not found in environment variables');
  process.exit(1);
}

if (!FORWARD_TO_EMAIL) {
  console.error('❌ Error: FORWARD_TO_EMAIL not found in environment variables');
  process.exit(1);
}

console.log('🚀 Setting up Mailgun route...');
console.log(`📧 Domain: ${MAILGUN_DOMAIN}`);
console.log(`📨 Forwarding to: ${FORWARD_TO_EMAIL}`);

// Route configuration
const routeData = new URLSearchParams({
  priority: '0',
  description: 'Forward all emails to personal inbox',
  expression: `match_recipient(".*@${MAILGUN_DOMAIN}")`,
  action: `forward("${FORWARD_TO_EMAIL}")`,
});

const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

const options = {
  hostname: 'api.mailgun.net',
  path: '/v3/routes',
  method: 'POST',
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
    if (res.statusCode === 200 || res.statusCode === 201) {
      const response = JSON.parse(data);
      console.log('\n✅ Route created successfully!');
      console.log(`📍 Route ID: ${response.route.id}`);
      console.log(`🎯 Expression: ${response.route.expression}`);
      console.log(`📬 Actions: ${response.route.actions.join(', ')}`);
      console.log('\n🎉 Setup complete! You can now use emails like:');
      console.log(`   • ahmed@${MAILGUN_DOMAIN}`);
      console.log(`   • linkedin@${MAILGUN_DOMAIN}`);
      console.log(`   • twitter@${MAILGUN_DOMAIN}`);
      console.log(`\n📥 All emails will be forwarded to: ${FORWARD_TO_EMAIL}`);
    } else {
      console.error(`\n❌ Failed to create route (Status: ${res.statusCode})`);
      console.error('Response:', data);

      try {
        const error = JSON.parse(data);
        if (error.message) {
          console.error('Error message:', error.message);
        }
      } catch (e) {
        // Not JSON, already printed raw data
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(routeData.toString());
req.end();
