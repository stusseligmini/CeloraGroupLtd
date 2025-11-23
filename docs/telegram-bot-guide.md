# Celora Telegram Bot User Guide

## Getting Started

### 1. Find the Bot
Search for `@Celora_Bot` in Telegram or click [this link](https://t.me/celora_bot).

### 2. Link Your Account

1. Open the Celora app (web or extension)
2. Go to **Settings → Telegram**
3. Click **"Link Telegram Account"**
4. You'll see a 6-digit verification code
5. Go back to Telegram and send `/start` to the bot
6. Enter the verification code when prompted

✅ **Your account is now linked!**

## Available Commands

### Wallet & Balance
- `/balance` - View all your wallet balances with current fiat values
- `/wallets` - List all your wallets across different blockchains

### Send & Receive
- `/send` - Send cryptocurrency (guided flow)
- `/receive` - Generate QR code to receive payments
  - Select blockchain
  - Get QR code and address

### Virtual Cards
- `/cards` - View and manage your virtual cards
- `/card <id>` - View specific card details

### Transaction History
- `/history` - View recent transactions
  - Filter by blockchain
  - Export options

### Settings
- `/settings` - Configure bot preferences
- `/link` - Link your Telegram account
- `/unlink` - Unlink your account

### Help
- `/start` - Show welcome message and main menu
- `/help` - Show all available commands

## Interactive Features

### Inline Buttons
Most bot responses include interactive buttons for quick actions:

- **Balance Screen**: Refresh balance, view specific chains
- **Card Management**: Freeze/unfreeze, view details
- **Send Flow**: Confirm, cancel, change amount
- **Main Menu**: Quick access to all features

### Multi-Step Flows

#### Sending Crypto
1. Send `/send` command
2. Select blockchain (Bitcoin, Ethereum, Solana, Celo)
3. Enter recipient address
4. Enter amount
5. Review transaction details
6. Confirm to send

#### Receiving Crypto
1. Send `/receive` command
2. Select blockchain
3. Receive QR code and address
4. Share or copy address

## Security Features

### PIN Protection
- Sensitive operations require verification
- View full card details requires PIN
- Large transactions may require confirmation

### Account Linking
- Secure 6-digit code verification
- 10-minute expiry for codes
- One Telegram account per Celora account

### Rate Limiting
- Commands are rate-limited to prevent abuse
- Maximum 10 requests per minute
- Automatic cooldown if exceeded

## Privacy

### What the Bot Can See
- Your Telegram username and ID
- Messages you send to the bot
- Button clicks you make

### What the Bot Cannot See
- Your other Telegram conversations
- Your contacts
- Your profile photo or bio

### Data Storage
- Only stores your Telegram ID for linking
- Transaction data synced with main Celora account
- No additional data collected by bot

## Tips & Tricks

### Quick Access
- Use Telegram's command menu (/ button) for fast command access
- Add bot to favorites for instant access
- Use inline buttons instead of typing commands

### Notifications
- Enable Telegram notifications in Settings
- Get instant alerts for:
  - Incoming transactions
  - Card usage
  - Security alerts
  - Important updates

### Multi-Device
- Bot works on all devices where you use Telegram
- Desktop, mobile, web - all synchronized
- One account, everywhere

## Troubleshooting

### "You need to link your account"
- Make sure you completed the linking process
- Try `/start` and follow the instructions
- Generate a new code in the Celora app if expired

### "Card not found"
- Card might have been deleted
- Try `/cards` to see all active cards
- Create new cards in the main Celora app

### "Transaction failed"
- Check wallet balance is sufficient
- Verify recipient address is correct
- Check blockchain network status
- Contact support if issue persists

### Bot not responding
- Check your internet connection
- Telegram service might be temporarily down
- Try again in a few minutes
- Contact support if problem continues

## Limitations

### What You CAN Do
✅ View balances
✅ Send/receive crypto
✅ Manage virtual cards
✅ View transaction history
✅ Get notifications

### What You CANNOT Do (Use Main App)
❌ Create new wallets
❌ Issue new cards
❌ Change card spending limits
❌ Access hidden vaults
❌ Modify security settings

## Support

### Get Help
- Send `/help` in the bot for command list
- Visit [support.celora.com](https://support.celora.com)
- Email: support@celora.com

### Report Issues
- Use `/support` command in bot
- Email: security@celora.com (for security issues)

### Feedback
We'd love to hear your feedback!
- Email: feedback@celora.com
- Rate the bot in Telegram

## FAQs

**Q: Is the bot secure?**
A: Yes! All communication is encrypted by Telegram. Your private keys never leave your Celora account.

**Q: Can I use the bot without linking?**
A: No, you must link your Telegram to your Celora account for security reasons.

**Q: What if I lose my phone?**
A: Your Celora account remains safe. Unlink Telegram from any device with Celora app access.

**Q: Are there fees for using the bot?**
A: No fees for bot usage. Normal blockchain transaction fees still apply.

**Q: Can I link multiple Telegram accounts?**
A: No, one Telegram account per Celora account for security.

---

**Need more help?** Contact support@celora.com

















