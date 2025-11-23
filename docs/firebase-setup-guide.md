# Firebase Setup Guide for GraphQL API

## Hvilken fil trenger du?

Du trenger **Firebase Service Account JSON-filen** for å verifisere Firebase ID tokens på server-side.

## Hvordan få Firebase Service Account filen

### 1. Gå til Firebase Console
1. Åpne [Firebase Console](https://console.firebase.google.com/)
2. Velg ditt prosjekt (eller opprett et nytt prosjekt)

### 2. Generer Service Account Key
1. Gå til **Project Settings** (⚙️ ikonet øverst til venstre)
2. Gå til **Service accounts** fanen
3. Klikk på **Generate new private key** knappen
4. En dialog vil spørre om bekreftelse - klikk **Generate key**
5. En JSON-fil vil lastes ned (f.eks. `your-project-firebase-adminsdk-xxxxx.json`)

### 3. Lagre filen

**Alternativ 1: Lagre som fil i prosjektet (anbefalt for lokal utvikling)**

1. Opprett en `secrets` mappe i prosjektet (og legg den til `.gitignore`):
   ```
   mkdir secrets
   ```

2. Flytt den nedlastede JSON-filen til `secrets/` mappen:
   ```
   secrets/firebase-service-account.json
   ```

3. Legg til i `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT=./secrets/firebase-service-account.json
   ```

**Alternativ 2: Legg inn som JSON string i .env (anbefalt for production)**

1. Åpne den nedlastede JSON-filen
2. Kopier hele innholdet
3. Legg til i `.env` (må være på én linje):
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```

**⚠️ VIKTIG:** Legg ALDRI denne filen eller JSON-innholdet i Git! Den inneholder private keys.

## Firebase Client Configuration

Du trenger også Firebase client-konfigurasjon for frontend. Den finner du i Firebase Console:

1. Gå til **Project Settings**
2. Scroll ned til **Your apps** seksjonen
3. Klikk på **Web app** (</> ikonet) hvis du ikke har en ennå
4. Kopier config-verdiene

Legg dem inn i `.env`:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Sjekkliste

- [ ] Firebase prosjekt opprettet
- [ ] Service Account JSON-fil nedlastet
- [ ] Service Account lagret i `secrets/` mappe ELLER kopiert som JSON string til `.env`
- [ ] `FIREBASE_SERVICE_ACCOUNT` satt i `.env`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` satt i `.env`
- [ ] Alle Firebase client config-verdier satt i `.env`
- [ ] `.env` lagt til `.gitignore` (hvis ikke allerede der)
- [ ] `secrets/` mappe lagt til `.gitignore` (hvis du bruker fil-alternativet)

## Test at det fungerer

1. Start serveren:
   ```bash
   npm run dev
   ```

2. Test GraphQL query:
   ```graphql
   query {
     me {
       id
       email
     }
   }
   ```

3. Hvis du får "Not authenticated", sjekk:
   - At du er logget inn med Firebase Auth
   - At Firebase ID token cookie er satt
   - At Firebase Admin SDK kan lese service account filen

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT environment variable is required"
- Sjekk at `FIREBASE_SERVICE_ACCOUNT` er satt i `.env`
- Sjekk at filstien er korrekt hvis du bruker fil-alternativet
- Sjekk at JSON-en er gyldig hvis du bruker string-alternativet

### "Failed to load service account"
- Sjekk at filen eksisterer på angitt sti
- Sjekk at filen har riktig format (gyldig JSON)
- Sjekk at private key er korrekt (må ha `\n` for linjeskift hvis du bruker string)

### "CEL expression failed"
- Dette betyr at autentiseringen feiler
- Sjekk at Firebase ID token cookie er satt
- Sjekk at token er gyldig (ikke utløpt)
- Test med `me` query i stedet for `user(key: {id_expr: "auth.uid"})`

