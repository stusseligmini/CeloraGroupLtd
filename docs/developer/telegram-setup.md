# Telegram Bot Setup Guide

## Prerequisites

- Telegram account
- Access to Celora backend
- Production deployment environment (Firebase/GCP)

## Step 1: Create Bot via BotFather

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts:
   - **Bot name**: `Celora Wallet` (or your choice)
   - **Bot username**: `celora_bot` (must end in `_bot` and be unique)

4. Save the **Bot Token** (looks like `123456:ABC-DEF1234...`)

⚠️ **Keep this token secret!**

## Step 2: Configure Bot Settings

Send these commands to @BotFather:

### Set Description
```
/setdescription @celora_bot
```
Then send:
```
Celora - Your all-in-one crypto wallet. Manage balances, send/receive crypto, and control virtual cards directly from Telegram.
```

### Set About Text
```
/setabouttext @celora_bot
```
Then send:
```
Official Celora wallet bot. Secure crypto management in Telegram.
```

### Set Commands
```
/setcommands @celora_bot
```
Then send:
```
start - Welcome and account linking
balance - View wallet balances
send - Send cryptocurrency
receive - Get QR code to receive
cards - Manage virtual cards
history - View transaction history
settings - Bot preferences
help - Show all commands
```

### Set Profile Photo
```
/setuserpic @celora_bot
```
Then upload the Celora logo

## Step 3: Environment Configuration

Add to your `.env.local` or production host settings:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_SECRET=your-random-secret-string-here

# Bot Configuration
TELEGRAM_BOT_ENABLED=true
TELEGRAM_WEBHOOK_URL=https://app.celora.com/api/telegram/webhook
```

### Generate Webhook Secret

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Set Webhook

### Development (Local Testing)

Use ngrok or similar:

```bash
# Start ngrok
ngrok http 3000

# Note the https URL (e.g., https://abc123.ngrok.io)

# Set webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abc123.ngrok.io/api/telegram/webhook",
    "secret_token": "your-webhook-secret"
  }'
```

### Production Deployment

```bash
# Set webhook to production URL
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.celora.com/api/telegram/webhook",
    "secret_token": "your-webhook-secret",
    "allowed_updates": ["message", "callback_query"]
  }'
```

## Step 5: Verify Webhook

Check webhook status:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Or visit your app endpoint:
```
GET https://app.celora.com/api/telegram/webhook
```

Expected response:
```json
{
  "configured": true,
  "webhookInfo": {
    "url": "https://app.celora.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Step 6: Test Bot

1. Search for your bot in Telegram
2. Send `/start`
3. Bot should respond with welcome message
4. Try `/help` to see all commands

## Step 7: Database Setup

Run migration to add Telegram tables:

```bash
npm run db:migrate
```

This creates:
- `telegram_users`
- `telegram_sessions`
- `telegram_notifications`
- Adds Telegram fields to `users` table

## Troubleshooting

### Bot Not Responding

**Check webhook status:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

**Look for errors:**
- `pending_update_count` > 0: Webhook failing
- `last_error_date`: Recent errors
- `last_error_message`: Error details

**Common issues:**
- SSL certificate invalid
- Webhook URL not accessible
- Secret token mismatch
- Rate limiting

### Delete Webhook (For Debugging)

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

Then you can use polling mode for testing:
```typescript
// Temporary polling for debug
setInterval(async () => {
  const updates = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
  );
  // Process updates...
}, 1000);
```

⚠️ **Don't use polling in production!**

### Test Webhook Locally

```bash
# Send test update to your local server
curl -X POST "http://localhost:3000/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: your-secret" \
  -d '{
    "update_id": 123456,
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456789,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 123456789,
        "type": "private"
      },
      "date": 1234567890,
      "text": "/start"
    }
  }'
```

## Security Best Practices

### 1. Keep Token Secret
- Never commit to git
- Store in your chosen secret manager (production)
- Rotate if compromised

### 2. Verify Webhook Signature
- Always check `X-Telegram-Bot-Api-Secret-Token` header
- Reject requests without valid signature

### 3. Rate Limiting
- Implement per-user rate limits
- Monitor for abuse
- Auto-ban suspicious activity

### 4. Input Validation
- Validate all user input
- Sanitize before database queries
- Prevent injection attacks

### 5. Secure Account Linking
- Short-lived verification codes (10 min)
- One-time use codes
- Audit all linking attempts

## Monitoring

### Log Important Events

```typescript
await prisma.auditLog.create({
  data: {
    action: 'telegram_command',
    resource: 'telegram',
    platform: 'telegram',
    status: 'success',
    metadata: {
      command: '/balance',
      userId: user.id,
    },
  },
});
```

### Track Metrics

- Commands per minute
- Error rate
- Response time
- Active users
- Linking success rate

### Alerts

Set up alerts for:
- Error rate > 5%
- Response time > 1s
- Webhook failures
- Unusual activity patterns

## Production Checklist

- [ ] Bot token stored in Key Vault
- [ ] Webhook secret configured
- [ ] SSL certificate valid
- [ ] Database migration applied
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Error tracking (Application Insights)
- [ ] Bot commands set in BotFather
- [ ] Profile photo uploaded
- [ ] Description added
- [ ] Tested account linking flow
- [ ] Tested all commands
- [ ] Load testing completed
- [ ] Security audit passed

## Support

### Telegram Bot API Documentation
https://core.telegram.org/bots/api

### Common Issues
https://core.telegram.org/bots/faq

### Celora Support
support@celora.com

---

**Ready to launch!** 🚀

















