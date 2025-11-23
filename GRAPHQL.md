# GraphQL API

## Start

```bash
npm run dev
```

## To måter å bruke GraphQL:

### 1. Custom Playground med Tabs (Anbefalt)
**URL:** `http://localhost:3000/graphql`

Har tre separate tabs:
- **🔐 Authentication** - Sett Firebase ID token
- **📝 Variables** - Legg til GraphQL variabler
- **🔍 Query / ✏️ Mutation** - Velg type og skriv query/mutation

### 2. Standard GraphiQL
**URL:** `http://localhost:3000/api/graphql`

Standard GraphiQL interface med innebygd Variables tab.

## Queries

### Hent bruker
```graphql
query {
  me {
    id
    email
    displayName
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
  }
}
```

### Hent Solana lommebøker
```graphql
query {
  wallets(blockchain: SOLANA) {
    id
    address
    label
    balanceFiat
  }
}
```

### Hent spesifikk lommebok
```graphql
query {
  wallet(id: "wallet-id") {
    id
    blockchain
    address
    transactions(limit: 5) {
      id
      txHash
      amount
      status
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
    amount
    tokenSymbol
    status
    timestamp
  }
}
```

## Mutations

### Opprett lommebok (Standard syntaks)

**Alle felter er valgfrie - defaults brukes hvis ikke spesifisert:**
```graphql
mutation {
  createWallet(input: {
    blockchain: SOLANA
    label: "Min Wallet"
    isDefault: true
  }) {
    id
    blockchain
    address
  }
}
```

**Minimalt (bruker defaults):**
```graphql
mutation {
  createWallet {
    id
    blockchain
    address
  }
}
```

**Med address (hvis generert client-side):**
```graphql
mutation {
  createWallet(input: {
    blockchain: SOLANA
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    label: "Min Wallet"
  }) {
    id
    blockchain
    address
  }
}
```

### Opprett lommebok (Firebase syntaks)

**I GraphiQL playground:**
1. Lim inn mutation i hovededitoren
2. Klikk på **"Variables"** tab (eller "Show parameters")
3. Lim inn JSON med variabler

**Med variabler (optional - ikke påkrevd):**
```graphql
mutation CreateWallet($blockchain: String, $label: String, $isDefault: Boolean) {
  wallet_insert(data: {
    blockchain: $blockchain
    label: $label
    isDefault: $isDefault
    userId_expr: "auth.uid"
  }) {
    id
    blockchain
    address
  }
}
```

**Variables (valgfritt - kun hvis du bruker variabler):**
```json
{
  "blockchain": "solana",
  "label": "Min Wallet",
  "isDefault": true
}
```

**OBS:** Du trenger IKKE variabler - bruk direkteverdier i stedet (se eksempler nedenfor).

**Alle felter er valgfrie - kan brukes uten variabler:**
```graphql
mutation {
  wallet_insert(data: {
    blockchain: "solana"
    label: "Min Wallet"
    isDefault: true
    userId_expr: "auth.uid"
  }) {
    id
    blockchain
    address
  }
}
```

**Minimalt (alle felter valgfrie):**
```graphql
mutation {
  wallet_insert(data: {
    userId_expr: "auth.uid"
  }) {
    id
    blockchain
    address
  }
}
```

**Med address:**
```graphql
mutation {
  wallet_insert(data: {
    blockchain: "solana"
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    label: "Min Wallet"
    userId_expr: "auth.uid"
  }) {
    id
    blockchain
    address
  }
}
```

## Endpoints

- **Custom Playground (med tabs):** `http://localhost:3000/graphql`
- **Standard GraphiQL:** `http://localhost:3000/api/graphql`
- **Production API:** `https://celora.io/api/graphql`

## Authentication

Alle queries krever autentisering (Firebase cookie).

### I Custom Playground (`/graphql`):
1. Gå til **🔐 Authentication** tab
2. Lim inn Firebase ID token
3. Token sendes automatisk som både Authorization header og cookie

### I Standard GraphiQL (`/api/graphql`):
- Bruker automatisk cookies fra browser session
- Hvis du trenger å sette token manuelt, bruk `/graphql` i stedet

## Tips

### Variables i GraphiQL
- Klikk på **"Variables"** eller **"Show parameters"** tab nederst til høyre
- Lim inn JSON med variabler der
- Variablene blir automatisk brukt når du kjører mutation

### Variabler er IKKE påkrevd
Alle felter er optional - du kan bruke direkteverdier uten variabler:

**Bruk dette (enklest):**
```graphql
mutation {
  wallet_insert(data: {
    userId_expr: "auth.uid"
    blockchain: "solana"
    label: "Min Wallet"
  }) {
    id
    blockchain
    address
  }
}
```

**ELLER med variabler (hvis du vil):**
1. Skriv mutation med `$variabelNavn` (uten `!` - optional)
2. Gå til **Variables** tab
3. Legg inn: `{ "blockchain": "solana", "label": "Min Wallet" }`
4. Klikk Run

**Anbefaling:** Bruk direkteverdier (første eksempel) - enklere og ingen variabler nødvendig!

---

## Alle Firebase CRUD-operasjoner

Alle entities har nå full Firebase GraphQL API-støtte:

### Tilgjengelige operasjoner per entity:

#### Wallet
- `wallet_insert` - Lag ny wallet
- `wallet_insertMany` - Lag flere wallets
- `wallet_upsert` - Oppdater eller lag nytt
- `wallet_update` - Oppdater eksisterende
- `wallet_updateMany` - Oppdater flere
- `wallet_delete` - Slett wallet
- `wallet_deleteMany` - Slett flere wallets

#### Card
- `card_insert`, `card_insertMany`, `card_upsert`, `card_update`, `card_updateMany`, `card_delete`, `card_deleteMany`

#### Notification
- `notification_insert`, `notification_insertMany`, `notification_upsert`, `notification_update`, `notification_updateMany`, `notification_delete`, `notification_deleteMany`

#### Transaction
- `transaction_insert`, `transaction_insertMany`, `transaction_upsert`, `transaction_update`, `transaction_updateMany`, `transaction_delete`, `transaction_deleteMany`

#### User
- `user_insert`, `user_insertMany`, `user_upsert`, `user_update`, `user_updateMany`, `user_delete`, `user_deleteMany`

### Eksempler:

#### InsertMany (Lag flere wallets)
```graphql
mutation {
  wallet_insertMany(data: [
    { blockchain: SOLANA, label: "Solana Wallet", userId_expr: "auth.uid" },
    { blockchain: ETHEREUM, label: "Ethereum Wallet", userId_expr: "auth.uid" }
  ]) {
    id
    blockchain
  }
}
```

#### Upsert (Oppdater eller lag nytt)
```graphql
mutation {
  wallet_upsert(
    key: { id: "wallet-id-here" }
    data: {
      blockchain: SOLANA
      label: "Oppdatert Wallet"
      userId_expr: "auth.uid"
    }
  ) {
    id
    blockchain
    label
  }
}
```

#### Update (Oppdater eksisterende)
```graphql
mutation {
  wallet_update(
    key: { id: "wallet-id-here" }
    data: {
      label: "Ny Label"
      isDefault: true
    }
  ) {
    id
    label
  }
}
```

#### UpdateMany (Oppdater flere)
```graphql
mutation {
  wallet_updateMany(
    where: { blockchain: SOLANA, userId_expr: "auth.uid" }
    data: { isDefault: false }
  )
}
# Returnerer: Int! (antall oppdaterte rader)
```

#### Delete (Slett wallet)
```graphql
mutation {
  wallet_delete(key: { id: "wallet-id-here" }) {
    id
  }
}
```

#### DeleteMany (Slett flere wallets)
```graphql
mutation {
  wallet_deleteMany(where: {
    blockchain: SOLANA
    userId_expr: "auth.uid"
  })
}
# Returnerer: Int! (antall slettede rader)
```

#### Insert Card
```graphql
mutation {
  card_insert(data: {
    walletId: "wallet-id"
    cardholderName: "John Doe"
    expiryMonth: 12
    expiryYear: 2025
    nickname: "Min Kort"
    userId_expr: "auth.uid"
  }) {
    id
    cardholderName
    nickname
  }
}
```

#### Insert Notification
```graphql
mutation {
  notification_insert(data: {
    type: "transaction"
    title: "Ny transaksjon"
    body: "Du har mottatt 100 SOL"
    userId_expr: "auth.uid"
    channels: ["push", "in-app"]
  }) {
    id
    title
    status
  }
}
```

---

## Tips

1. **userId_expr: "auth.uid"** - Automatisk setter `userId` til den autentiserte brukeren
2. **key: { id_expr: "auth.uid" }** - Refererer til den autentiserte brukeren i key
3. Alle `where` clauses filtreres automatisk av `userId` for sikkerhet
4. `updateMany` og `deleteMany` returnerer antall påvirkede rader (Int!)

