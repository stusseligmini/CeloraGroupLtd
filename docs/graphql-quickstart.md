# GraphQL Quick Start Guide

## 🚀 Kom i gang på 3 minutter

### 1. Start serveren

```bash
npm run dev
```

### 2. Åpne GraphiQL Playground

Gå til:
```
http://localhost:3000/api/graphql
```

### 3. Test en enkel query

Kopier og lim inn denne queryen i GraphiQL playground:

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

Trykk på **Run** knappen (▶️).

## 📝 Vanlige Queries

### Hent bruker med lommebøker

```graphql
query {
  me {
    id
    email
    displayName
    wallets {
      id
      blockchain
      address
      label
      balanceFiat
      isDefault
    }
  }
}
```

### Hent lommebøker

```graphql
query {
  wallets {
    id
    blockchain
    address
    label
    balanceFiat
    fiatCurrency
    isDefault
  }
}
```

### Hent lommebøker for Solana

```graphql
query {
  wallets(blockchain: SOLANA) {
    id
    address
    label
    balanceCache
    balanceFiat
  }
}
```

### Hent spesifikk lommebok

```graphql
query {
  wallet(id: "wallet-id-her") {
    id
    blockchain
    address
    label
    balanceFiat
    transactions(limit: 5) {
      id
      txHash
      amount
      tokenSymbol
      status
      timestamp
    }
  }
}
```

### Hent transaksjoner

```graphql
query {
  transactions(limit: 20) {
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

## 🔑 Authentication

**Viktig:** Alle queries krever autentisering!

1. Du må være logget inn (ha en gyldig Firebase ID token cookie)
2. Hvis du får "Not authenticated" feil:
   - Logg inn gjennom web appen først
   - Eller send Firebase ID token i cookies

## 🎯 Firebase-style Query

Hvis du vil bruke Firebase GraphQL-syntaks:

```graphql
query MeQuery {
  user(key: {id_expr: "auth.uid"}) {
    id
    email
    displayName
    wallets_on_user {
      id
      blockchain
      address
      label
      balanceFiat
    }
  }
}
```

**Note:** Denne fungerer bare hvis Firebase Auth er konfigurert riktig.

## 🛠️ Mutations

### Opprett lommebok

```graphql
mutation {
  createWallet(input: {
    blockchain: SOLANA
    label: "Min Solana Wallet"
    isDefault: true
  }) {
    id
    blockchain
    address
    label
  }
}
```

## 📚 Schema Explorer

I GraphiQL playground kan du:
- Se hele schema ved å klikke på **Docs** i høyre sidebar
- Se tilgjengelige queries og mutations
- Få autocomplete når du skriver
- Se type definitions

## 🐛 Feilsøking

### "Not authenticated"
- Logg inn først gjennom web appen
- Sjekk at cookies er satt

### "Failed to compute UUID_Expr"
- Firebase Admin SDK er ikke konfigurert
- Bruk `me` query i stedet for `user(key: {id_expr: "auth.uid"})`

### "User not found"
- Du er autentisert, men bruker eksisterer ikke i database
- Du må kanskje opprette en bruker først gjennom REST API

## 🔗 Nettverk / cURL

Hvis du vil teste med cURL eller Postman:

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: firebase-id-token=YOUR_TOKEN" \
  -d '{
    "query": "{ me { id email } }"
  }'
```

## 📖 Full dokumentasjon

- **Schema dokumentasjon:** `docs/graphql-schema.md`
- **Setup guide:** `docs/graphql-api-setup.md`
- **Status:** `docs/graphql-status.md`

