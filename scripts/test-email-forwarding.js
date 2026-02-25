#!/usr/bin/env node

/**
 * Send a test email to verify the forwarding setup
 */

const https = require('https');

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = 'klaro.tools';
const TEST_EMAIL = 'test@klaro.tools'; // Test address
const FROM_EMAIL = 'noreply@klaro.tools';

if (!MAILGUN_API_KEY) {
  console.error('❌ Error: MAILGUN_API_KEY not found');
  process.exit(1);
}

console.log('📧 Sending test email to verify forwarding...');
console.log(`📬 To: ${TEST_EMAIL}`);

const formData = new URLSearchParams({
  from: `Test Sender <${FROM_EMAIL}>`,
  to: TEST_EMAIL,
  subject: 'Test Email - Mailgun Forwarding Setup',
  text: 'This is a test email to verify that your Mailgun forwarding is working correctly.\n\nIf you receive this at quteishatahmed@gmail.com, your setup is successful!',
  html: '<div style="font-family: Arial, sans-serif;"><h2>Test Email</h2><p>This is a test email to verify that your Mailgun forwarding is working correctly.</p><p><strong>If you receive this at quteishatahmed@gmail.com, your setup is successful!</strong></p></div>',
});

const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

const options = {
  hostname: 'api.eu.mailgun.net',
  path: `/v3/${MAILGUN_DOMAIN}/messages`,
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': formData.toString().length,
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
      console.log('\n✅ Test email sent successfully!');
      console.log(`📨 Message ID: ${response.id}`);
      console.log('\n⏰ Check quteishatahmed@gmail.com in 1-2 minutes.');
      console.log('   The subject should be: [test@klaro.tools] Test Email - Mailgun Forwarding Setup');
    } else {
      console.error(`\n❌ Failed to send (Status: ${res.statusCode})`);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(formData.toString());
req.end();
