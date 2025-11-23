# Deployment Verification Guide

This guide provides detailed steps for verifying a successful deployment.

## Automated Verification

### Health Check Endpoint

The health check endpoint provides a quick way to verify the application is running:

```bash
curl https://<PRODUCTION_URL>/api/diagnostics/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "cache": "connected"
    }
  }
}
```

**Verification Criteria:**
- Status code: 200
- Response time: <500ms
- All services show "connected"

### Smoke Tests

Run automated smoke tests after deployment:

```bash
# Install Playwright if needed
npx playwright install --with-deps chromium

# Run smoke tests
npm run test:e2e -- --grep "smoke"
```

**Critical Smoke Tests:**
1. Health check endpoint is accessible
2. Authentication page loads
3. API endpoints return expected status codes
4. No critical JavaScript errors in console

## Manual Verification

### 1. Authentication Flow

**Sign In:**
1. Navigate to `/signin`
2. Verify page loads without errors
3. Attempt to sign in with test credentials
4. Verify redirect to home page after successful authentication
5. Check that session cookie is set

**Sign Up:**
1. Navigate to `/signup`
2. Verify page loads without errors
3. Attempt to create a new account
4. Verify email verification flow (if enabled)

### 2. Wallet Operations

**View Wallets:**
1. Navigate to home page (should show wallet overview)
2. Verify wallet summary loads
3. Check that balances are displayed correctly
4. Verify wallet list is populated

**Create Wallet:**
1. Navigate to wallet creation flow
2. Select blockchain (Ethereum, Solana, etc.)
3. Complete wallet creation
4. Verify wallet appears in list
5. Check that wallet address is displayed

### 3. Transaction History

1. Navigate to transaction history page
2. Verify transactions load
3. Check pagination works
4. Verify transaction details are accurate
5. Check that timestamps are correct

### 4. Virtual Cards (if enabled)

1. Navigate to `/cards`
2. Verify card list loads
3. Attempt to create a new virtual card
4. Verify card details are displayed
5. Check that card status is correct

### 5. Telegram Bot

1. Send `/start` command to Telegram bot
2. Verify bot responds
3. Test `/balance` command
4. Test `/wallets` command
5. Verify webhook is receiving updates

### 6. API Endpoints

Test critical API endpoints:

```bash
# Wallet Summary (should return 401 without auth)
curl -X GET https://<PRODUCTION_URL>/api/wallet/summary

# Transactions (should return 401 without auth)
curl -X GET https://<PRODUCTION_URL>/api/transactions

# Cards (should return 401 without auth)
curl -X GET https://<PRODUCTION_URL>/api/cards

# Health Check (should return 200)
curl -X GET https://<PRODUCTION_URL>/api/diagnostics/health
```

**Expected Behavior:**
- Unauthenticated requests return 401
- Health check returns 200
- All endpoints respond within 2 seconds

## Performance Verification

### Response Times

Check that response times are acceptable:

```bash
# Health check
time curl -s https://<PRODUCTION_URL>/api/diagnostics/health

# API endpoint (with auth)
time curl -s -H "Authorization: Bearer <TOKEN>" \
  https://<PRODUCTION_URL>/api/wallet/summary
```

**Target Response Times:**
- Health check: <200ms
- API endpoints: <500ms (p95)
- Page loads: <2s (First Contentful Paint)

### Database Performance

Check database query performance:

1. Navigate to Azure Portal
2. Go to Application Insights
3. Check "Dependencies" tab
4. Verify database queries are <100ms (p95)
5. Check for slow queries (>1s)

### Memory and CPU

Monitor resource usage:

1. Navigate to Azure Portal
2. Go to App Service → Metrics
3. Check:
   - CPU usage: <70% average
   - Memory usage: <80% average
   - No memory leaks (gradual increase over time)

## Error Monitoring

### Application Insights

1. Navigate to Application Insights
2. Check "Failures" tab
3. Verify error rate is <1% of requests
4. Review any new exceptions
5. Check for error spikes

### Log Analysis

Check structured logs for issues:

1. Navigate to Application Insights → Logs
2. Run query:
   ```kusto
   traces
   | where severityLevel >= 3
   | where timestamp > ago(1h)
   | summarize count() by bin(timestamp, 5m)
   ```
3. Verify no critical errors
4. Check for warning patterns

## Security Verification

### Headers

Verify security headers are set:

```bash
curl -I https://<PRODUCTION_URL>
```

**Required Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`

### CORS

Verify CORS is configured correctly:

```bash
curl -H "Origin: https://unauthorized-domain.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://<PRODUCTION_URL>/api/wallet/summary
```

**Expected:**
- Only allowed origins can access API
- Unauthorized origins are blocked

### Rate Limiting

Test rate limiting:

```bash
# Make multiple rapid requests
for i in {1..20}; do
  curl -X GET https://<PRODUCTION_URL>/api/wallet/summary
done
```

**Expected:**
- Rate limiting kicks in after threshold
- Returns 429 Too Many Requests

## Monitoring Setup Verification

### Alerts

Verify alert rules are active:

1. Navigate to Azure Monitor → Alert rules
2. Check that all critical alerts are enabled:
   - High error rate
   - High latency
   - Database connection failures
   - Low availability

### Dashboards

Verify monitoring dashboards are accessible:

1. Navigate to Application Insights → Dashboards
2. Check that key metrics are visible:
   - Request rate
   - Response time
   - Error rate
   - Dependency performance

## Post-Deployment Checklist

After deployment, verify:

- [ ] All automated tests pass
- [ ] Manual verification completed
- [ ] Performance metrics are normal
- [ ] No errors in Application Insights
- [ ] Security headers are set
- [ ] Rate limiting is working
- [ ] Monitoring alerts are configured
- [ ] Team is notified of successful deployment

## Troubleshooting

### Health Check Fails

1. Check Application Insights for errors
2. Verify database connection
3. Check environment variables
4. Review application logs

### High Error Rate

1. Check Application Insights → Failures
2. Review exception details
3. Check for dependency failures
4. Verify environment configuration

### Slow Response Times

1. Check database query performance
2. Review Application Insights → Performance
3. Check for memory/CPU issues
4. Verify cache is working

### Authentication Issues

1. Verify Azure AD B2C configuration
2. Check token validation
3. Review authentication logs
4. Verify redirect URIs are correct

## Escalation

If critical issues are found:

1. **Immediate:** Execute rollback procedure
2. **Notify:** Alert on-call engineer
3. **Document:** Create incident report
4. **Investigate:** Root cause analysis
5. **Fix:** Deploy hotfix if needed

