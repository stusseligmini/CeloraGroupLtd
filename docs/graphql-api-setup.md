# GraphQL API Setup Guide

## Overview

Celora now has a functional GraphQL API endpoint that you can use to query and mutate data.

## Endpoint

```
http://localhost:3000/api/graphql
```

Or in production:
```
https://celora.io/api/graphql
```

## GraphiQL Playground

In development mode, you can access the GraphiQL playground at:
```
http://localhost:3000/api/graphql
```

This provides an interactive interface to explore the schema and test queries.

## Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Access GraphiQL

Open your browser and navigate to:
```
http://localhost:3000/api/graphql
```

### 3. Example Queries

#### Get Current User (Standard)

```graphql
query {
  me {
    id
    email
    displayName
    username
  }
}
```

#### Get Current User (Firebase-style with key)

```graphql
query MeQuery {
  user(key: {id_expr: "auth.uid"}) {
    id
    email
    displayName
    username
    createdAt
    wallets_on_user {
      id
      blockchain
      address
      publicKey
      label
      isDefault
      isHidden
      walletType
      balanceCache
      balanceFiat
      fiatCurrency
      createdAt
      updatedAt
    }
  }
}
```

**Note:** Even though we don't support `@auth` directives directly, all queries automatically require authentication through context. The `key: {id_expr: "auth.uid"}` syntax is supported and will automatically use the authenticated user's ID.

**IMPORTANT:** This query requires Firebase authentication. If you get a "CEL expression failed" error, it means Firebase Admin SDK is not configured correctly or authentication failed. Make sure:
1. `FIREBASE_SERVICE_ACCOUNT` is set in `.env`
2. You are logged in and have a valid Firebase ID token cookie
3. For local development, you may need to use `me` query instead

#### Get All Wallets

```graphql
query {
  wallets {
    id
    blockchain
    address
    label
    balanceFiat
    isDefault
  }
}
```

#### Get Wallets by Blockchain

```graphql
query {
  wallets(blockchain: SOLANA) {
    id
    address
    label
    balanceCache
    transactions(limit: 5) {
      id
      txHash
      amount
      status
    }
  }
}
```

#### Get Single Wallet

```graphql
query {
  wallet(id: "wallet-id-here") {
    id
    blockchain
    address
    transactions(limit: 10) {
      id
      txHash
      fromAddress
      toAddress
      amount
      tokenSymbol
      status
      timestamp
    }
  }
}
```

#### Get Transactions

```graphql
query {
  transactions(limit: 20, status: CONFIRMED) {
    id
    txHash
    blockchain
    fromAddress
    toAddress
    amount
    tokenSymbol
    status
    timestamp
  }
}
```

## Authentication

The GraphQL API uses the same authentication as the REST API. You need to be authenticated via cookies (from web app) or include an authorization header.

For testing in GraphiQL:
1. Log in through the web app first
2. The cookies will be automatically included in requests

For programmatic access, include the auth token in headers:
```
Authorization: Bearer <token>
```

Or use cookies if accessing from the same domain.

## Current Features

### Queries (Read Operations)

- ✅ `me` - Get current user
- ✅ `wallets` - List user wallets (with optional blockchain filter)
- ✅ `wallet(id)` - Get single wallet by ID
- ✅ `transactions` - Get transactions (with filters)

### Mutations (Write Operations)

- ✅ `createWallet` - Create a new wallet (simplified implementation)
- ⚠️ `sendTransaction` - Not yet implemented (use REST API for now)

## Schema Documentation

See `docs/graphql-schema.md` for complete schema documentation with all types, enums, and input types.

## Extending the Schema

To add more queries or mutations:

1. **Add to Schema** (`src/lib/graphql/schema.ts`):
   - Define new types if needed
   - Add to QueryType or MutationType

2. **Add Resolvers**:
   - Implement the resolver logic
   - Use `context.prisma` for database access
   - Use `context.userId` for authenticated user

3. **Test**:
   - Use GraphiQL playground to test
   - Verify authentication works
   - Test error cases

## Example: Adding a New Query

```typescript
// In src/lib/graphql/schema.ts

// Add to QueryType fields:
notifications: {
  type: new GraphQLList(NotificationType),
  args: {
    limit: { type: GraphQLInt, defaultValue: 20 },
  },
  resolve: async (parent, args, context) => {
    if (!context.userId) {
      throw new Error('Not authenticated');
    }
    return context.prisma.notification.findMany({
      where: { userId: context.userId },
      take: args.limit || 20,
      orderBy: { createdAt: 'desc' },
    });
  },
},
```

## Troubleshooting

### "Not authenticated" error
- Make sure you're logged in
- Check that cookies are being sent
- Verify authentication middleware is working

### Schema not loading
- Check that `src/lib/graphql/schema.ts` has no syntax errors
- Verify all imports are correct
- Check server logs for errors

### Database connection errors
- Verify DATABASE_URL is set in `.env`
- Check that Prisma client is generated (`npm run db:generate`)
- Ensure database is running

## Next Steps

1. Add more queries for:
   - Cards
   - Notifications
   - Payment requests
   - Staking positions
   - etc.

2. Implement mutations for:
   - Sending transactions
   - Creating cards
   - Updating user profile
   - etc.

3. Add subscriptions for real-time updates

4. Add rate limiting and security middleware

5. Add comprehensive error handling

## Resources

- [GraphQL Yoga Documentation](https://the-guild.dev/graphql/yoga-server)
- [GraphQL Schema Documentation](./graphql-schema.md)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

