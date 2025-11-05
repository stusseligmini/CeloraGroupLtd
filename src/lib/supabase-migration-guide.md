# Supabase Client Migration Guide

## Status
**This project has multiple Supabase client implementations that need to be consolidated.**

## Recommended Clients (USE THESE)

### Browser/Client-Side Code
```typescript
import { supabase } from '@/lib/supabase/client'
```
- File: `src/lib/supabase/client.ts`
- Purpose: Browser-side operations
- Features: Auto session management, RLS-aware, real-time subscriptions

### Server-Side Code (API Routes, Middleware)
```typescript
import { supabaseServer } from '@/lib/supabase/server'
```
- File: `src/lib/supabase/server.ts`
- Purpose: Server-side admin operations
- Features: Service role access, bypasses RLS, full admin privileges

## Legacy Clients (DEPRECATE THESE)

### ❌ `src/lib/supabase.ts`
- **Status**: DEPRECATED - Too basic, no error handling
- **Replace with**: `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server)

### ❌ `src/lib/supabaseClient.ts`
- **Status**: DEPRECATED - Over-engineered singleton with complex error handling
- **Replace with**: `@/lib/supabase/client`
- **Note**: Contains useful error handling patterns that could be extracted to utilities

### ❌ `src/lib/supabase-browser.ts`
- **Status**: DEPRECATED - Wrapper around supabaseClient.ts
- **Replace with**: `@/lib/supabase/client`

### ❌ `src/lib/supabaseSingleton.ts`
- **Status**: DEPRECATED - Another wrapper layer
- **Replace with**: `@/lib/supabase/client`

## Utility Files (KEEP BUT REFACTOR)

### ✅ `src/lib/supabaseCleanup.ts`
- **Status**: USEFUL - Keep as utility
- **Purpose**: Cleanup problematic cookies and storage
- **Action**: Can be used by the standard clients if needed

### ✅ `src/lib/supabaseErrorHandling.ts`
- **Status**: USEFUL - Keep as utility
- **Purpose**: Retry logic and error recovery
- **Action**: Extract patterns into standard client if needed

## Migration Steps

### Step 1: Identify Usage
Run this to find all imports:
```bash
grep -r "from.*supabase" src/ --include="*.ts" --include="*.tsx"
```

### Step 2: Replace Imports

**For browser/client components:**
```typescript
// OLD
import { supabase } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/supabaseSingleton'
import { getBrowserClient } from '@/lib/supabase-browser'

// NEW
import { supabase } from '@/lib/supabase/client'
```

**For server/API routes:**
```typescript
// OLD
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)

// NEW
import { supabaseServer } from '@/lib/supabase/server'
```

### Step 3: Remove Deprecated Files
After migration is complete:
1. Delete `src/lib/supabase.ts`
2. Delete `src/lib/supabaseClient.ts`
3. Delete `src/lib/supabase-browser.ts`
4. Delete `src/lib/supabaseSingleton.ts`

### Step 4: Consolidate Utilities
Consider moving cleanup and error handling functions into:
- `src/lib/supabase/utils.ts` - for shared utilities
- `src/lib/supabase/error-handling.ts` - for error recovery

## Current File Count
- **Total Supabase-related files**: 8
- **Target after migration**: 4 (client.ts, server.ts, types.ts, utils.ts)
- **Reduction**: 50% fewer files

## Testing Checklist
After migration, verify:
- [ ] Authentication works (sign in/sign out)
- [ ] Real-time subscriptions work
- [ ] API routes can access database
- [ ] RLS policies are respected in client code
- [ ] Server routes have admin access
- [ ] No "Multiple GoTrueClient" warnings in console
- [ ] Session persistence works across page reloads

## Timeline
- **Phase 1**: Document current usage (DONE)
- **Phase 2**: Create migration guide (DONE)
- **Phase 3**: Update imports (TODO - will be done when codebase is fully refactored)
- **Phase 4**: Remove deprecated files (TODO - after Phase 3)
- **Phase 5**: Extract useful utilities (TODO - nice to have)

