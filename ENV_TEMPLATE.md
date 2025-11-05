# 📝 Environment Variables Setup

## Setup Instructions

1. Create a file named `.env.local` in the root of your project
2. Copy the template below into that file
3. Fill in your actual values

---

## `.env.local` Template

```env
# =============================================================================
# SUPABASE CONFIGURATION
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# =============================================================================
# SOLANA CONFIGURATION  
# =============================================================================
# QuikNode RPC Endpoints
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/your-token/
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://your-endpoint.solana-devnet.quiknode.pro/your-token/
NEXT_PUBLIC_SOLANA_RPC_TESTNET=https://your-endpoint.solana-testnet.quiknode.pro/your-token/

# =============================================================================
# ENCRYPTION & SECURITY (REQUIRED!)
# =============================================================================
# Generate a strong 32+ character random string
MASTER_ENCRYPTION_KEY=your-very-long-secure-random-string-min-32-characters

# JWT Secret for sessions
JWT_SECRET=your-jwt-secret-key-here

# =============================================================================
# APPLICATION
# =============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🔐 How to Generate Secure Keys

### Option 1: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 2: Using OpenSSL
```bash
openssl rand -hex 32
```

### Option 3: Using PowerShell
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## ⚠️ Important Notes

- **NEVER** commit `.env.local` to version control
- Generate NEW keys for production (don't reuse development keys)
- `MASTER_ENCRYPTION_KEY` must be at least 32 characters
- Keep your Supabase service role key SECRET

---

## ✅ After Setup

1. Create `.env.local` with your values
2. Restart the dev server: `npm run dev`
3. Visit `http://localhost:3000/signin`


