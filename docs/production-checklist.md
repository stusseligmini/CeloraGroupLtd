# Production Deployment Checklist

This checklist ensures all critical steps are completed before deploying to production.

## Pre-Deployment

### Environment Variables
- [ ] All required environment variables are set in Azure App Service Configuration
- [ ] Database connection string is configured and tested
- [ ] Azure AD B2C credentials are configured
- [ ] Telegram bot token and webhook secret are set
- [ ] Card issuing provider API keys are configured (if applicable)
- [ ] Blockchain RPC URLs are configured for all supported chains
- [ ] Application Insights instrumentation key is set
- [ ] Redis connection string is configured (if using Redis cache)
- [ ] All secrets are stored in Azure Key Vault (not in plain text)

### Database
- [ ] Database migrations are up to date (`prisma migrate deploy`)
- [ ] Database backup is taken before migration
- [ ] Connection pooling (PgBouncer) is configured for production
- [ ] Database indexes are optimized
- [ ] Row-Level Security (RLS) policies are enabled
- [ ] Audit log retention policy is configured

### Infrastructure
- [ ] Azure Web App is running on appropriate SKU (at least S1)
- [ ] Application Insights is enabled and configured
- [ ] Azure Front Door is configured for CDN and DDoS protection
- [ ] SSL certificates are valid and auto-renewal is enabled
- [ ] Custom domain is configured and DNS is pointing correctly
- [ ] WAF (Web Application Firewall) rules are configured
- [ ] Auto-scaling rules are set up
- [ ] Health check endpoint is configured in Azure

### Security
- [ ] All secrets have been rotated in the last 90 days
- [ ] Security audit has been performed
- [ ] CORS origins are restricted to production domains only
- [ ] Content Security Policy (CSP) headers are configured
- [ ] Rate limiting is enabled on API endpoints
- [ ] DDoS protection is active
- [ ] Security headers are configured (X-Frame-Options, etc.)

### Code Quality
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage is above 70%
- [ ] No critical security vulnerabilities in dependencies
- [ ] Linting passes without errors
- [ ] TypeScript compilation succeeds
- [ ] Build completes successfully

### Monitoring & Alerts
- [ ] Application Insights is collecting telemetry
- [ ] Alert rules are configured for:
  - [ ] High error rate (>5% of requests)
  - [ ] High API latency (>2s p95)
  - [ ] Database connection failures
  - [ ] Low availability (<99.9%)
  - [ ] High exception rate
- [ ] On-call rotation is set up
- [ ] Incident response plan is documented

## Deployment Steps

1. [ ] Merge to `main` branch (triggers CI pipeline)
2. [ ] Wait for CI pipeline to complete successfully
3. [ ] Verify staging deployment is successful
4. [ ] Run smoke tests on staging
5. [ ] Deploy to production:
   ```bash
   # Manual deployment via Azure CLI (if needed)
   az webapp deployment source sync \
     --name <PRODUCTION_WEBAPP_NAME> \
     --resource-group <RESOURCE_GROUP>
   ```
6. [ ] Run database migrations:
   ```bash
   az webapp config appsettings set \
     --name <PRODUCTION_WEBAPP_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --settings SKIP_ENV_VALIDATION='true'
   # Then run migrations via Azure Portal or Kudu console
   ```
7. [ ] Verify deployment in Azure Portal

## Post-Deployment Verification

### Health Checks
- [ ] Health endpoint responds: `GET /api/diagnostics/health`
- [ ] Response time is <500ms
- [ ] All dependencies (database, Redis) are connected

### Critical Endpoints
- [ ] Authentication flow works: `/signin`, `/signup`
- [ ] Wallet summary API: `GET /api/wallet/summary`
- [ ] Transaction API: `GET /api/transactions`
- [ ] Card API: `GET /api/cards`
- [ ] Telegram webhook: `POST /api/telegram/webhook`

### User Flows
- [ ] User can sign in
- [ ] User can create/view wallets
- [ ] User can view transaction history
- [ ] User can create virtual cards (if enabled)
- [ ] Telegram bot responds to commands

### Monitoring
- [ ] Application Insights shows no errors
- [ ] Response times are within acceptable range
- [ ] Database query performance is normal
- [ ] No memory leaks or resource exhaustion
- [ ] Alert rules are not triggering false positives

### Rollback Plan
- [ ] Previous deployment version is identified
- [ ] Rollback procedure is documented
- [ ] Team knows how to execute rollback
- [ ] Rollback can be completed within 15 minutes

## Communication

- [ ] Deployment announcement sent to team
- [ ] Stakeholders notified of deployment
- [ ] Monitoring dashboard is shared
- [ ] On-call engineer is aware of deployment

## Post-Deployment (First 24 Hours)

- [ ] Monitor error rates closely
- [ ] Check Application Insights for anomalies
- [ ] Verify user reports (if any)
- [ ] Review performance metrics
- [ ] Check database performance
- [ ] Verify all scheduled jobs are running
- [ ] Monitor Telegram bot activity

## Emergency Rollback

If critical issues are detected:

1. [ ] Identify the issue and severity
2. [ ] Notify team and stakeholders
3. [ ] Execute rollback:
   ```bash
   az webapp deployment slot swap \
     --name <PRODUCTION_WEBAPP_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --slot staging \
     --target-slot production
   ```
4. [ ] Verify rollback was successful
5. [ ] Document the issue and root cause
6. [ ] Create incident report

## Notes

- Keep this checklist updated as the deployment process evolves
- Review and update quarterly
- Store completed checklists for audit purposes

