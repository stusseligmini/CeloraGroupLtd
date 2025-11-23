# GraphQL API Status

## ✅ Ferdig implementert

### Core GraphQL Server
- ✅ GraphQL Yoga server opprettet på `/api/graphql`
- ✅ Schema definert med alle typer (User, Wallet, Transaction)
- ✅ Firebase Authentication integrert
- ✅ Context med Prisma database tilgang
- ✅ GraphiQL playground i development mode

### Queries
- ✅ `me` - Hent nåværende bruker
- ✅ `user(key: {id_expr: "auth.uid"})` - Firebase-style user query
- ✅ `wallets` - List alle lommebøker (med optional blockchain filter)
- ✅ `wallet(id)` - Hent spesifikk lommebok
- ✅ `transactions` - Hent transaksjoner (med filters)

### Mutations
- ✅ `createWallet` - Opprett ny lommebok (simplified)
- ⚠️ `sendTransaction` - Ikke implementert ennå (bruk REST API)

### Types
- ✅ User type med `wallets_on_user` relation
- ✅ Wallet type med transactions relation
- ✅ Transaction type
- ✅ Alle nødvendige Enums (Blockchain, TransactionStatus, etc.)

### Authentication
- ✅ Firebase Auth integration
- ✅ Cookie-based session management
- ✅ Automatic `auth.uid` mapping for Firebase GraphQL compatibility

## 🔧 Nødvendig konfigurasjon

### Miljøvariabler (.env)

```env
# Firebase Configuration (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # JSON string eller path til fil
```

## 📝 Eksempel queries

### Get Current User med Wallets

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
      label
      isDefault
      balanceFiat
      fiatCurrency
      transactions(limit: 5) {
        id
        txHash
        amount
        status
        timestamp
      }
    }
  }
}
```

### Get Wallets by Blockchain

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

### Get Transactions

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

## 🚀 Hvordan bruke

1. **Start serveren:**
   ```bash
   npm run dev
   ```

2. **Åpne GraphiQL playground:**
   ```
   http://localhost:3000/api/graphql
   ```

3. **Test queries:**
   - GraphiQL playground har autocomplete og dokumentasjon
   - Alle queries krever autentisering (Firebase cookie)

## ⚠️ Kjente problemer / TODO

1. **AuthProvider må oppdateres** - Client-side authentication må endres fra Azure MSAL til Firebase Auth
2. **API routes** - Noen API routes bruker fortsatt sync `getUserIdFromRequest`, må oppdateres til async
3. **Mutations** - `sendTransaction` mutation er ikke implementert (bruk REST API i mellomtiden)
4. **Error handling** - Kan forbedres med bedre feilmeldinger

## 🔧 Feilshøting

### "CEL expression failed: cannot read auth.uid" feil

Dette betyr at Firebase Admin SDK ikke er konfigurert riktig, eller at autentiseringen feiler.

**Løsning:**
1. Sjekk at `FIREBASE_SERVICE_ACCOUNT` er satt i `.env`
2. Verifiser at Firebase ID token cookie er satt (sjekk i browser DevTools -> Application -> Cookies)
3. For lokal utvikling, kan du bruke Firebase Emulator eller sette opp service account

**For lokal utvikling uten Firebase:**
Hvis du ikke har Firebase satt opp ennå, kan du:
- Bruke `me` query i stedet for `user(key: {id_expr: "auth.uid"})`
- Eller sette opp Firebase Emulator for testing

### "Not authenticated" feil

Dette betyr at ingen gyldig Firebase ID token ble funnet i cookies.

**Løsning:**
1. Sjekk at du er logget inn
2. Sjekk at cookies er sendt med requesten
3. Verifiser at cookie-navnet er riktig (`firebase-id-token` eller `firebase-auth-token`)

## 📚 Dokumentasjon

- Schema dokumentasjon: `docs/graphql-schema.md`
- Setup guide: `docs/graphql-api-setup.md`

## 🎯 Neste steg

1. Konfigurer Firebase i `.env`
2. Oppdater AuthProvider til å bruke Firebase Auth (client-side)
3. Test GraphQL queries i GraphiQL playground
4. Legg til flere mutations etter behov

