#!/usr/bin/env node

/**
 * List all Mailgun routes
 */

const https = require('https');

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;

if (!MAILGUN_API_KEY) {
  console.error('❌ Error: MAILGUN_API_KEY not found');
  process.exit(1);
}

const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

const options = {
  hostname: 'api.mailgun.net',
  path: '/v3/routes',
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`,
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
      console.log('📋 Your existing Mailgun routes:\n');

      if (response.items && response.items.length > 0) {
        response.items.forEach((route, index) => {
          console.log(`Route ${index + 1}:`);
          console.log(`  ID: ${route.id}`);
          console.log(`  Priority: ${route.priority}`);
          console.log(`  Expression: ${route.expression}`);
          console.log(`  Actions: ${route.actions.join(', ')}`);
          console.log(`  Created: ${route.created_at}`);
          console.log('');
        });
      } else {
        console.log('No routes found.');
      }

      console.log(`Total routes: ${response.total_count}`);
    } else {
      console.error(`❌ Failed (Status: ${res.statusCode})`);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();
