# Telegram Bot Integration Setup Guide

## Overview

Celora now supports Telegram bot integration, allowing users to interact with their wallet directly from Telegram. Users can check balances, send SOL, and access their wallet via Telegram Mini App.

## Features

### Telegram Bot Commands

- `/start` - Welcome message and help
- `/wallet` - Open wallet Mini App or create new wallet
- `/balance` - Check SOL balance
- `/send @username 0.5 SOL` - Send SOL to username or address
- `/help` - Show available commands

### Telegram Mini App Integration

- Deep linking from Telegram to wallet
- Seamless wallet access within Telegram
- Transaction confirmation via Mini App

## Setup Instructions

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Save the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Configure Environment Variables

Add to your `.env.local` or environment configuration:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_ENABLED=true
TELEGRAM_WEBHOOK_SECRET=generate-32-char-secret
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_MINI_APP_URL=https://your-domain.com
```

### 3. Set Webhook URL

The webhook is automatically set when the bot is enabled. You can also set it manually:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### 4. Link User Accounts

Users need to link their Telegram account to their Celora wallet:

1. User opens the app
2. Navigates to settings/Telegram linking
3. Clicks "Link Telegram Account"
4. Bot sends a unique link or code
5. User completes linking via Telegram

Or programmatically via API:

```typescript
POST /api/telegram/link
{
  "telegramId": "123456789",
  "telegramUsername": "username"
}
```

## API Endpoints

### POST /api/telegram/webhook

Handles incoming Telegram webhook messages and commands.

**Security:**
- Webhook secret verification (optional)
- Rate limiting
- User authentication via telegramId

**Supported Messages:**
- Text messages with commands
- Callback queries (button clicks)

### POST /api/telegram/link

Links a Telegram account to a Celora user account.

**Request:**
```json
{
  "telegramId": "123456789",
  "telegramUsername": "username"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "telegramId": "123456789",
    "telegramUsername": "username",
    "linkedAt": "2025-01-01T00:00:00Z"
  }
}
```

## Database Schema

The `User` model already includes Telegram fields:

```prisma
model User {
  telegramId              String?  @unique
  telegramUsername        String?
  telegramLinkedAt        DateTime?
  telegramNotificationsEnabled Boolean @default(true)
}
```

## Usage Examples

### User Flow: Send SOL via Telegram

1. User sends: `/send @dexter 0.5 SOL`
2. Bot resolves username to address
3. Bot sends confirmation button
4. User clicks button → Opens Mini App
5. User confirms transaction in Mini App
6. Transaction is signed and broadcast
7. Bot sends confirmation message

### User Flow: Check Balance

1. User sends: `/balance`
2. Bot fetches user's Solana wallet
3. Bot queries balance from API
4. Bot sends formatted balance message

### User Flow: Open Wallet

1. User sends: `/wallet`
2. Bot checks if user has wallet
3. If yes: Opens Mini App with wallet dashboard
4. If no: Shows "Create Wallet" button

## Security Considerations

1. **Webhook Verification**: Verify webhook requests come from Telegram
2. **Rate Limiting**: Implement rate limits on webhook endpoint
3. **User Authentication**: Always verify telegramId matches authenticated user
4. **Private Keys**: Never expose private keys - all signing happens client-side
5. **Transaction Signing**: Transactions must be signed in Mini App, not via bot

## Testing

### Local Development

1. Use ngrok or similar to expose local server:
   ```bash
   ngrok http 3000
   ```

2. Update webhook URL to ngrok URL:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-ngrok-url.ngrok.io/api/telegram/webhook"
   ```

3. Test commands by sending messages to your bot

### Production

1. Ensure webhook URL is publicly accessible
2. Set up SSL certificate (HTTPS required)
3. Monitor webhook logs for errors
4. Set up alerts for failed webhook deliveries

## Troubleshooting

### Bot not responding

1. Check `TELEGRAM_BOT_ENABLED=true`
2. Verify bot token is correct
3. Check webhook URL is set correctly
4. Review server logs for errors

### User linking fails

1. Ensure `telegramId` is unique in database
2. Check user is authenticated when calling link API
3. Verify database schema has been migrated

### Commands not working

1. Check webhook is receiving messages
2. Verify user has linked Telegram account
3. Ensure user has created Solana wallet
4. Review command parsing logic

## Next Steps

- [ ] Add more commands (/history, /deposit, etc.)
- [ ] Implement transaction notifications via Telegram
- [ ] Add inline query support for quick wallet access
- [ ] Set up Telegram Mini App deep linking
- [ ] Add rate limiting per user
- [ ] Implement command aliases and shortcuts

