# Application Insights Telemetry

Comprehensive telemetry solution for Celora PWA with client and server-side tracking.

## Installation

```bash
npm install
```

The following packages are required (already in package.json):
- `@microsoft/applicationinsights-web` - Client-side tracking
- `@microsoft/applicationinsights-react-js` - React integration  
- `applicationinsights` - Server-side tracking

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# Client-side (publicly accessible)
NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://xxx
NEXT_PUBLIC_APPINSIGHTS_INSTRUMENTATION_KEY=xxx-xxx-xxx-xxx
NEXT_PUBLIC_APPINSIGHTS_SAMPLING_PERCENTAGE=100
NEXT_PUBLIC_APPINSIGHTS_AUTO_TRACKING=true
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=development

# Server-side (secure)
APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;IngestionEndpoint=https://xxx
APPINSIGHTS_SAMPLING_PERCENTAGE=100
APPINSIGHTS_AUTO_COLLECT=true
APP_VERSION=1.0.0
```

### Azure Portal Setup

1. Create Application Insights resource in Azure Portal
2. Copy **Connection String** from Overview page
3. Copy **Instrumentation Key** from Overview page
4. Add to environment variables

## Usage

### Client-Side Tracking

The `TelemetryProvider` is already integrated in `src/app/layout.tsx`:

```tsx
import { TelemetryProvider } from '@/components/TelemetryProvider';

// Wraps your app
<TelemetryProvider>
  <YourApp />
</TelemetryProvider>
```

#### Track Custom Events

```tsx
import { trackEvent, TelemetryEvents } from '@/lib/telemetry';

// Predefined events
trackEvent({
  name: TelemetryEvents.WALLET_VIEWED,
  properties: {
    walletId: '123',
    userId: 'abc',
  },
  measurements: {
    loadTime: 450,
  },
});

// Custom events
trackEvent({
  name: 'custom.event',
  properties: { key: 'value' },
  measurements: { metric: 100 },
});
```

#### Track Errors

```tsx
import { trackError } from '@/lib/telemetry';

try {
  // Your code
} catch (error) {
  trackError({
    error: error as Error,
    properties: {
      context: 'wallet-fetch',
      userId: user?.id,
    },
    severityLevel: 'Error',
  });
}
```

#### Track Authentication

```tsx
import { trackAuthSuccess, trackAuthFailure } from '@/lib/telemetry';

// On successful login
trackAuthSuccess(user.id, 'azure-b2c');

// On failed login
trackAuthFailure('invalid_credentials', 'azure-b2c');
```

#### Track API Calls

```tsx
import { trackApiRequest } from '@/lib/telemetry';

const startTime = Date.now();
const response = await fetch('/api/wallet/summary');
const duration = Date.now() - startTime;

trackApiRequest(
  '/api/wallet/summary',
  'GET',
  response.status,
  duration,
  response.ok
);
```

#### Set User Context

```tsx
import { setAuthenticatedUser, clearAuthenticatedUser } from '@/lib/telemetry';

// After successful authentication
setAuthenticatedUser(user.id, user.accountId);

// On logout
clearAuthenticatedUser();
```

### Server-Side Tracking

#### Initialize in API Routes

```ts
// src/app/api/route.ts (root API handler)
import { initializeServerTelemetry } from '@/lib/telemetry';

// Initialize once at app startup
initializeServerTelemetry();
```

#### Track API Routes

```ts
import { trackApiRoute } from '@/lib/telemetry';

export async function GET(request: Request) {
  return trackApiRoute('/api/wallet/summary', 'GET', async () => {
    // Your handler logic
    const data = await fetchWalletData();
    return Response.json(data);
  });
}
```

#### Track Database Operations

```ts
import { trackDatabaseOperation } from '@/lib/telemetry';
import { prisma } from '@/server/db/client';

async function getUserWallets(userId: string) {
  return trackDatabaseOperation('findMany', 'Wallet', async () => {
    return await prisma.wallet.findMany({
      where: { userId },
    });
  });
}
```

#### Track External API Calls

```ts
import { trackExternalApi } from '@/lib/telemetry';

async function fetchCeloPrice() {
  return trackExternalApi('celo-api', '/api/v1/price', 'GET', async () => {
    const response = await fetch('https://api.celo.org/v1/price');
    return response.json();
  });
}
```

#### Track Authentication Events

```ts
import { trackAuthEvent } from '@/lib/telemetry';

// On successful login
trackAuthEvent('login', user.id);

// On logout
trackAuthEvent('logout', user.id);

// On token refresh
trackAuthEvent('refresh', user.id);

// On authentication failure
trackAuthEvent('failure', undefined, 'invalid_token');
```

#### Track Custom Server Events

```ts
import { trackServerEvent, trackServerTrace, trackServerException } from '@/lib/telemetry';

// Track event
trackServerEvent({
  name: 'wallet.created',
  properties: {
    userId: user.id,
    walletType: 'celo',
  },
  measurements: {
    creationTime: 250,
  },
});

// Track trace
trackServerTrace({
  message: 'Processing transaction batch',
  properties: {
    batchSize: '50',
  },
  severityLevel: 'Information',
});

// Track exception
trackServerException({
  exception: error,
  properties: {
    operation: 'transaction-processing',
  },
  severityLevel: 'Error',
});
```

## Predefined Events

### Authentication Events
- `auth.login.success` - User logged in successfully
- `auth.login.failure` - Login failed
- `auth.logout` - User logged out
- `auth.token.refresh` - Token refreshed
- `auth.token.expired` - Token expired
- `auth.session.timeout` - Session timed out

### API Events
- `api.request.start` - API request started
- `api.request.success` - API request succeeded
- `api.request.failure` - API request failed
- `api.request.timeout` - API request timed out

### Wallet Events
- `wallet.created` - Wallet created
- `wallet.viewed` - Wallet viewed
- `wallet.transaction` - Transaction performed

### Notification Events
- `notification.received` - Push notification received
- `notification.clicked` - Notification clicked
- `notification.dismissed` - Notification dismissed

### Error Events
- `error.boundary` - React error boundary caught error
- `error.network` - Network error occurred
- `error.validation` - Validation error

### Performance Events
- `performance.slow.api` - API call took >2s
- `performance.slow.render` - Render took >1s

## Azure Portal Dashboards

### Recommended KQL Queries

#### Auth Failures (Last 24h)
```kql
customEvents
| where timestamp > ago(24h)
| where name == "auth.login.failure"
| summarize count() by tostring(customDimensions.error), bin(timestamp, 1h)
| render timechart
```

#### API P95 Latency
```kql
customEvents
| where timestamp > ago(24h)
| where name == "api.request.success" or name == "api.request.failure"
| extend duration = todouble(customMeasurements.duration)
| summarize percentile(duration, 95) by tostring(customDimensions.endpoint), bin(timestamp, 5m)
| render timechart
```

#### Error Rate by Type
```kql
exceptions
| where timestamp > ago(24h)
| summarize count() by type, bin(timestamp, 1h)
| render barchart
```

#### Slow API Calls
```kql
customEvents
| where timestamp > ago(24h)
| where name == "performance.slow.api"
| extend duration = todouble(customMeasurements.duration)
| extend endpoint = tostring(customDimensions.endpoint)
| project timestamp, endpoint, duration
| order by duration desc
```

## Alerts Configuration

### Recommended Alerts

1. **High Auth Failure Rate**
   - Query: `customEvents | where name == "auth.login.failure"`
   - Threshold: >10 failures/min
   - Severity: Warning

2. **API Latency Spike**
   - Query: `customEvents | where name contains "api.request" | extend duration = todouble(customMeasurements.duration)`
   - Threshold: P95 >2000ms
   - Severity: Warning

3. **Exception Rate**
   - Query: `exceptions`
   - Threshold: >5 exceptions/min
   - Severity: Error

4. **Availability Drop**
   - Query: Built-in availability tests
   - Threshold: <95%
   - Severity: Critical

## Sampling & Retention

### Sampling Configuration

- **Development**: 100% sampling (all telemetry collected)
- **Staging**: 50% sampling (balance between cost and coverage)
- **Production**: 20-50% sampling (adjust based on volume)

Configure via environment variables:
```env
NEXT_PUBLIC_APPINSIGHTS_SAMPLING_PERCENTAGE=100
APPINSIGHTS_SAMPLING_PERCENTAGE=100
```

### Data Retention

Default retention in Azure Application Insights: **90 days**

To extend:
1. Go to Application Insights resource
2. Navigate to **Usage and estimated costs**
3. Click **Data Retention**
4. Select retention period (up to 730 days)

## Best Practices

1. **Use Predefined Events**: Leverage `TelemetryEvents` constants for consistency
2. **Include Context**: Always add relevant properties (userId, endpoint, etc.)
3. **Track Performance**: Use measurements for timing data
4. **Set User Context**: Call `setAuthenticatedUser()` after login
5. **Handle Errors**: Track exceptions with appropriate severity levels
6. **Monitor Costs**: Adjust sampling in production to control ingestion costs
7. **Create Dashboards**: Build custom dashboards for key metrics
8. **Set Up Alerts**: Configure alerts for critical failures

## Troubleshooting

### Telemetry Not Appearing

1. **Check Connection String**: Verify environment variables are set
2. **Check Console**: Look for initialization errors
3. **Check Sampling**: Increase sampling percentage temporarily
4. **Check Firewall**: Ensure Application Insights endpoints are allowed
5. **Wait for Ingestion**: Can take 1-2 minutes for data to appear

### High Costs

1. **Reduce Sampling**: Lower `APPINSIGHTS_SAMPLING_PERCENTAGE`
2. **Filter Noise**: Exclude health check endpoints
3. **Archive Old Data**: Move old logs to cheaper storage
4. **Use Log Analytics**: Query directly instead of continuous export

### Missing Types

If TypeScript complains about missing types:
```bash
npm install @types/node --save-dev
```

## Integration with Error Boundary

The `ErrorBoundary` component automatically tracks errors:

```tsx
// src/components/ErrorBoundary.tsx
import { trackError } from '@/lib/telemetry';

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  trackError({
    error,
    properties: {
      componentStack: errorInfo.componentStack,
    },
    severityLevel: 'Error',
  });
}
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure environment variables
3. ✅ Test in development
4. ✅ Create Azure dashboards (see KQL queries above)
5. ✅ Set up alerts (see recommendations above)
6. ✅ Adjust sampling for production
7. ✅ Monitor costs and performance
