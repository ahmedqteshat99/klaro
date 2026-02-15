# Email Configuration for klaro.tools

## Overview
Configure Supabase authentication emails to be sent from klaro.tools using Mailgun SMTP to avoid spam folders.

## Prerequisites
- Mailgun account with verified domain (klaro.tools or mg.klaro.tools)
- Access to DNS settings for klaro.tools
- Supabase project admin access

## Step 1: Mailgun DNS Configuration

Add these DNS records to klaro.tools:

### SPF Record (Sender Policy Framework)
```
Type: TXT
Host: @ (or klaro.tools)
Value: v=spf1 include:mailgun.org ~all
TTL: 3600
```

### DKIM Record (DomainKeys Identified Mail)
```
Type: TXT
Host: [provided by Mailgun - usually something like: k1._domainkey]
Value: [provided by Mailgun - long key starting with k=rsa...]
TTL: 3600
```

### DMARC Record (Domain-based Message Authentication)
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@klaro.tools
TTL: 3600
```

### MX Records (if receiving emails)
```
Type: MX
Host: @
Value: mxa.eu.mailgun.org (Priority: 10)
Value: mxb.eu.mailgun.org (Priority: 10)
TTL: 3600
```

## Step 2: Get Mailgun SMTP Credentials

1. Go to Mailgun Dashboard → Sending → Domain Settings
2. Click on your domain (mg.klaro.tools or klaro.tools)
3. Find **SMTP credentials** section
4. Note down:
   - SMTP hostname: `smtp.eu.mailgun.org` (EU) or `smtp.mailgun.org` (US)
   - SMTP username: `postmaster@mg.klaro.tools`
   - SMTP password: [Reset if needed]
   - Port: 587 (TLS) or 465 (SSL)

## Step 3: Configure Supabase Custom SMTP

### Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** (https://supabase.com/dashboard)
2. Select your project: **assistenzarzt-pro**
3. Navigate to **Authentication** → **Email Templates**
4. Scroll down to **SMTP Settings**
5. Enable **Custom SMTP Provider**
6. Fill in the details:

```
SMTP Host: smtp.eu.mailgun.org
SMTP Port: 587
SMTP Username: postmaster@mg.klaro.tools
SMTP Password: [your_mailgun_smtp_password]
Sender Email: noreply@klaro.tools
Sender Name: Klaro
```

7. Click **Save**

### Via Supabase CLI (Alternative)

Update `supabase/config.toml`:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[auth.email.smtp]
enabled = true
host = "smtp.eu.mailgun.org"
port = 587
user = "postmaster@mg.klaro.tools"
pass = "env(SMTP_PASSWORD)"
admin_email = "noreply@klaro.tools"
sender_name = "Klaro"
```

Add to `.env.local`:
```bash
SMTP_PASSWORD=your_mailgun_smtp_password
```

## Step 4: Customize Email Templates

Go to **Authentication** → **Email Templates** and customize:

### Confirm Signup Email
```html
<h2>Willkommen bei Klaro!</h2>
<p>Bitte bestätigen Sie Ihre E-Mail-Adresse:</p>
<a href="{{ .ConfirmationURL }}">E-Mail bestätigen</a>
<p>Dieser Link ist 24 Stunden gültig.</p>
<p>Mit freundlichen Grüßen,<br>Ihr Klaro Team</p>
```

### Magic Link Email
```html
<h2>Anmeldung bei Klaro</h2>
<p>Klicken Sie auf den folgenden Link, um sich anzumelden:</p>
<a href="{{ .ConfirmationURL }}">Jetzt anmelden</a>
<p>Dieser Link ist 1 Stunde gültig.</p>
```

### Reset Password Email
```html
<h2>Passwort zurücksetzen</h2>
<p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
<a href="{{ .ConfirmationURL }}">Neues Passwort festlegen</a>
<p>Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
```

## Step 5: Additional Spam Prevention

### 1. Set up Email Warm-up
- Start by sending emails to valid addresses
- Gradually increase volume over 2-4 weeks
- Monitor bounce rates (<5%) and spam complaints (<0.1%)

### 2. Monitor Email Reputation
- Use Mailgun Analytics: Dashboard → Analytics
- Check deliverability rates
- Monitor spam complaints
- Set up webhook notifications

### 3. Add Unsubscribe Link (GDPR Compliance)
All marketing emails should include:
```html
<p style="font-size: 11px; color: #999;">
  Sie erhalten diese E-Mail, weil Sie sich bei Klaro registriert haben.
  <a href="{{ .UnsubscribeURL }}">Abmelden</a>
</p>
```

## Step 6: Testing

### Test Email Delivery

1. **Create test account** in your app
2. **Check delivery** in Mailgun Dashboard → Sending → Logs
3. **Verify headers** in received email:
   - From: noreply@klaro.tools
   - SPF: PASS
   - DKIM: PASS
   - DMARC: PASS

### Test Spam Score

Use these tools:
- https://www.mail-tester.com
- Forward verification email to the provided address
- Check spam score (should be 8+/10)

### Common Issues

**Emails still in spam?**
- Check DNS propagation (can take 24-48 hours): https://dnschecker.org
- Verify SPF, DKIM, DMARC records are correct
- Check sender reputation: https://talosintelligence.com
- Warm up the domain gradually

**SMTP connection fails?**
- Double-check SMTP credentials
- Try different ports: 587 (TLS), 465 (SSL), 2525 (backup)
- Check firewall/IP restrictions in Mailgun
- Enable "Allow less secure apps" if needed

**Links not working?**
- Ensure redirect URLs match in Supabase Dashboard → Authentication → URL Configuration
- Check: `Site URL` and `Redirect URLs`

## Step 7: Production Checklist

Before going live:

- [ ] DNS records added and verified (SPF, DKIM, DMARC)
- [ ] Mailgun domain verified (green checkmark)
- [ ] Custom SMTP configured in Supabase
- [ ] Email templates customized in German
- [ ] Test emails delivered successfully
- [ ] Spam score checked (8+/10)
- [ ] Email headers verified (SPF, DKIM, DMARC pass)
- [ ] Unsubscribe links functional
- [ ] Rate limits configured (avoid being flagged)
- [ ] Monitoring/alerts set up in Mailgun

## Monitoring & Maintenance

### Daily
- Check Mailgun Dashboard for bounces/complaints
- Monitor delivery rates (should be >95%)

### Weekly
- Review spam complaints (<0.1%)
- Check sender reputation scores

### Monthly
- Audit email templates for compliance
- Review DNS records for changes
- Test deliverability with mail-tester.com

## Support Resources

- **Mailgun Docs**: https://documentation.mailgun.com
- **Supabase SMTP Guide**: https://supabase.com/docs/guides/auth/auth-smtp
- **Email Deliverability**: https://www.mailgun.com/blog/deliverability
- **DNS Checker**: https://dnschecker.org

## Environment Variables Reference

```bash
# Production (.env.production)
SMTP_HOST=smtp.eu.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.klaro.tools
SMTP_PASSWORD=your_production_smtp_password
SMTP_FROM=noreply@klaro.tools
SMTP_FROM_NAME=Klaro

# Development (.env.local) - optional
SMTP_HOST=smtp.eu.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.klaro.tools
SMTP_PASSWORD=your_dev_smtp_password
SMTP_FROM=dev@mg.klaro.tools
SMTP_FROM_NAME=Klaro (Dev)
```

---

**Last Updated**: 2026-02-15
**Maintained By**: Klaro Development Team
