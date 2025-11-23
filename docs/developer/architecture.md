# Celora Architecture Documentation

## System Overview

Celora is a multi-platform digital wallet and payment platform consisting of:

1. **Next.js PWA** - Main web application
2. **Browser Extension** - Chrome/Edge/Firefox wallet extension
3. **Telegram Bot** - Command-line interface via Telegram
4. **Telegram Mini App** - Full web app within Telegram

All platforms share a common backend, database, and security infrastructure.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Language**: TypeScript 5.4
- **Styling**: Tailwind CSS
- **State Management**: React Context + SWR
- **Components**: Radix UI + shadcn/ui

### Backend
- **Runtime**: Node.js 20+
- **API**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Azure Cache for Redis)
- **Authentication**: Azure AD B2C + Custom Telegram auth

### Infrastructure
- **Hosting**: Azure App Service
- **Database**: Azure Database for PostgreSQL
- **CDN**: Azure Front Door
- **Secrets**: Azure Key Vault
- **Monitoring**: Azure Application Insights
- **CI/CD**: GitHub Actions

### Blockchain
- **Ethereum/Celo**: ethers.js
- **Bitcoin**: bitcoinjs-lib
- **Solana**: @solana/web3.js
- **RPC Providers**: Alchemy, QuickNode

## Database Schema

### Core Models

**User**
- Azure B2C integration
- Telegram linking
- Card provider preferences
- 2FA settings

**Wallet**
- Multi-chain support
- Encrypted private keys
- Balance caching
- Hidden vault support

**Card**
- Virtual/physical cards
- Encrypted card details
- Spending limits
- Advanced controls (MCC, geo-fencing)

**Transaction**
- Multi-chain transactions
- Status tracking
- Gas fee recording

**TelegramUser**
- Telegram account linking
- Verification codes
- Session management

**AuditLog**
- All sensitive operations
- Multi-platform tracking
- Security compliance

See [`prisma/schema.prisma`](../../prisma/schema.prisma) for full schema.

## Security Architecture

### Authentication Flow

```
User → Azure AD B2C → JWT Token → API Routes → Database
```

**Telegram Bot Authentication:**
```
User → Telegram Bot → Verification Code → Link API → Database
```

### Encryption

- **Card Numbers**: AES-256-GCM
- **CVV**: AES-256-GCM
- **Private Keys**: AES-256-GCM
- **PINs**: bcrypt hashing

See [`src/lib/security/encryption.ts`](../../src/lib/security/encryption.ts)

### Rate Limiting

- **Auth Endpoints**: 5 req/min
- **API Writes**: 30 req/min
- **API Reads**: 60 req/min
- **Telegram Bot**: 10 req/min per user

### CSRF Protection

- Double-submit cookie pattern
- Token validation on all state-changing operations
- Automatic token rotation

### Content Security Policy

- Strict CSP headers
- Nonce-based script execution
- No unsafe-inline or unsafe-eval

## Card Issuing Architecture

### Multi-Provider System

```typescript
interface ICardIssuingProvider {
  createCard()
  getCard()
  freezeCard()
  // ... more methods
}
```

**Supported Providers:**
1. **Mock** - Free development/testing
2. **Gnosis Pay** - Crypto-native, self-custodial
3. **Highnote** - Traditional fiat cards
4. **Deserve** - Backup provider

See [`src/server/services/cardIssuing/`](../../src/server/services/cardIssuing/)

### Provider Selection

```typescript
// Auto-select based on user preference and card type
if (cardType === 'crypto-native') {
  return 'gnosis';
} else if (cardType === 'traditional') {
  return 'highnote';
}
```

## Telegram Bot Architecture

### Components

1. **Bot Client** (`src/server/telegram/client.ts`)
   - Message queue
   - Rate limiting
   - Retry logic

2. **Commands** (`src/server/telegram/commands/`)
   - `/start`, `/balance`, `/cards`, etc.
   - Modular command handlers

3. **Handlers** (`src/server/telegram/handlers/`)
   - Webhook processing
   - Callback queries (buttons)

4. **Middleware** (`src/server/telegram/middleware/`)
   - Authentication
   - Logging
   - Rate limiting

### Bot Flow

```
Telegram → Webhook → Handler → Command → Database → Response
```

## API Endpoints

### Authentication
- `POST /api/auth/b2c/session` - Azure B2C session
- `POST /api/telegram/link/initiate` - Start Telegram linking
- `POST /api/telegram/link/verify` - Verify linking code

### Wallets
- `GET /api/wallet/summary` - Wallet balances
- `GET /api/wallet/vault` - Hidden vault access

### Cards
- `GET /api/cards` - List cards
- `POST /api/cards` - Create card
- `PATCH /api/cards/[id]` - Update card
- `DELETE /api/cards/[id]` - Cancel card

### Telegram
- `POST /api/telegram/webhook` - Bot webhook
- `GET /api/telegram/link/status` - Link status
- `DELETE /api/telegram/link/status` - Unlink

### Diagnostics
- `GET /api/diagnostics/health` - Health check
- `GET /api/diagnostics/env` - Environment info

## Shared Services

### Transaction Service
`src/server/services/transactionService.ts`

- Multi-chain transaction broadcasting
- Validation
- Status tracking

### Price Oracle Service
`src/server/services/priceService.ts`

- Multi-source price aggregation
- Redis caching (1 min TTL)
- CoinGecko integration

### Notification Service
`src/server/services/notificationService.ts`

- Multi-channel delivery (push, email, Telegram)
- Queue management
- Template rendering

### QR Code Generator
`src/lib/qrcode-generator.ts`

- EIP-681 (Ethereum)
- BIP-21 (Bitcoin)
- Solana Pay format

## Extension Architecture

### Structure

```
extension/
├── manifest.json           # Extension manifest (v3)
├── popup.html             # Popup UI
├── src/
│   ├── popup.tsx          # React popup app
│   └── messaging.ts       # Chrome messaging
└── background/
    └── service-worker.js  # Background tasks
```

### Communication

```
Popup ←→ Service Worker ←→ Main App ←→ API
```

### Features
- Real-time balance sync
- Transaction notifications
- Card management
- Auto-lock security

## Deployment

### Environments

1. **Development** (`npm run dev`)
   - Local Next.js server
   - Mock card provider
   - Local database (optional)

2. **Staging** (`staging.celora.com`)
   - Azure App Service
   - Staging database
   - Test bot token

3. **Production** (`app.celora.com`)
   - Multi-region Azure deployment
   - Production database
   - Real card providers
   - Live bot

### CI/CD Pipeline

```yaml
GitHub Push → Actions Run → Tests → Build → Deploy to Azure
```

See [`.github/workflows/`](../../.github/workflows/)

### Database Migrations

```bash
# Create migration
npm run db:migrate -- --name add_feature

# Deploy to production
npm run db:migrate:deploy
```

## Performance Optimization

### Caching Strategy

1. **Redis Cache**
   - Wallet balances (1 min)
   - Price data (1 min)
   - Session data (15 min)

2. **Browser Cache**
   - Static assets (1 year)
   - API responses (no-cache)

3. **CDN**
   - Global distribution
   - Edge caching
   - DDoS protection

### Database Optimization

- Connection pooling (PgBouncer)
- Read replicas for queries
- Indexed foreign keys
- Materialized views for analytics

## Monitoring & Observability

### Application Insights

- Request telemetry
- Dependency tracking
- Exception logging
- Custom events

### Metrics Tracked

- API response times
- Database query performance
- Card transaction success rate
- Bot command usage
- Error rates per platform

### Alerts

- API errors > 1%
- Response time > 1s
- Database CPU > 80%
- Failed transactions > 5%

## Security Best Practices

### Code
- No secrets in code
- Input validation (Zod)
- SQL injection prevention (Prisma)
- XSS protection (React)
- CSRF tokens

### Operations
- Secrets in Key Vault
- Principle of least privilege
- Regular security audits
- Dependency scanning (Snyk)
- HTTPS everywhere

### Data
- Encryption at rest
- Encryption in transit
- PII minimization
- GDPR compliance
- Regular backups

## Scaling Strategy

### Horizontal Scaling

- Multiple App Service instances
- Load balancing via Front Door
- Stateless architecture
- Redis for session state

### Database Scaling

- Read replicas
- Connection pooling
- Query optimization
- Partitioning (future)

### Bot Scaling

- Webhook mode (not polling)
- Async message processing
- Queue for slow operations
- Rate limiting

## Development Workflow

### Setup

```bash
git clone https://github.com/celora/celorav2.git
cd CeloraV2
npm install
cp .env.example .env.local
npm run dev
```

### Code Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/             # Utilities
├── server/          # Backend services
│   ├── services/    # Business logic
│   └── telegram/    # Bot implementation
└── types/           # TypeScript types
```

### Coding Standards

- TypeScript strict mode
- ESLint + Prettier
- 70% test coverage minimum
- Pull request required
- Code review mandatory

---

For more details, see individual service documentation.

















