# Monitoring & Observability (Non-Custodial)

All legacy cloud-specific monitoring instructions removed. This product now relies on:

- Client-side performance metrics (Web Vitals)
- Error tracking (optional: Sentry or OpenTelemetry exporter)
- Transaction status polling via RPC provider (Helius / QuickNode)
- Lightweight server logs (username resolution, public metadata)

## What To Implement

1. Browser metrics: integrate a small hook to record page load, interaction delays.
2. RPC health: periodic ping of Solana RPC endpoint; fallback to secondary.
3. Error tracking: capture unexpected exceptions (never keys or seeds).
4. Security events: failed transaction signatures, malformed requests.

## Not Included

- Centralized application performance suite tied to proprietary platforms.
- Vendor-specific alerting scripts.

## Suggested Stack

| Layer | Tool |
|-------|------|
| Frontend metrics | Vercel Analytics |
| Errors | Sentry SDK (optional) |
| RPC uptime | Custom heartbeat cron |
| Alerts | Slack webhook + minimal Node script |

## Example Heartbeat Script (server-only)
```ts
import fetch from 'node-fetch';

async function heartbeat() {
  const start = Date.now();
  try {
    const res = await fetch(process.env.SOLANA_RPC!, { method: 'POST', body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getHealth' }) });
    const ok = res.ok;
    const ms = Date.now() - start;
    if (!ok) throw new Error('rpc unhealthy');
    console.log('rpc ok', ms+'ms');
  } catch (e) {
    // send simple alert
    await fetch(process.env.ALERT_WEBHOOK!, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text:`RPC heartbeat failed: ${e}` }) });
  }
}
heartbeat();
```

## Status
This document intentionally excludes legacy vendor references. Monitoring is minimal, privacy-respecting, and key-safe.

3. Terraform or Bicep deployment completed

## Alert Rules

The following alert rules are configured:

### 1. High API Error Rate
- **Metric**: `requests/failed` with `request/resultCode = 5xx`
- **Threshold**: > 10 failed requests in 5 minutes
- **Severity**: Warning
- **Action**: Email/SMS notification via Action Group

### 2. High API Latency (P95)
- **Metric**: `requests/duration`
- **Threshold**: P95 > 2000ms (2 seconds)
- **Severity**: Warning
- **Window**: 15 minutes
- **Action**: Email/SMS notification

### 3. Database Connection Failures
- **Metric**: `exceptions/count` with `exception/type = DatabaseException`
- **Threshold**: > 5 exceptions in 5 minutes
- **Severity**: Critical
- **Action**: Immediate notification

### 4. Application Availability Drop
- **Metric**: `availabilityResults/availabilityPercentage`
- **Threshold**: < 95% availability
- **Severity**: Critical
- **Window**: 15 minutes
- **Action**: Immediate notification

### 5. High Exception Rate
- **Metric**: `exceptions/count`
- **Threshold**: > 25 exceptions in 5 minutes (5/min)
- **Severity**: Warning
- **Action**: Email/SMS notification

### 6. Slow Database Queries
- **Metric**: `dependencies/duration` with `dependency/type = SQL`
- **Threshold**: Average > 1000ms (1 second)
- **Severity**: Informational
- **Window**: 15 minutes
- **Action**: Email notification

## Setting Up Alerts

### Using Terraform

1. Navigate to the monitoring module:
   ```bash
   cd infra/terraform/modules/global-monitoring
   ```

2. Review and customize alert thresholds in `alerts.tf`

3. Deploy alerts:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

### Alert Configuration (Generic)

Use infrastructure-as-code where possible:
1. Define alert specs in a versioned config file (YAML/JSON).
2. Deploy via script (e.g., custom Node CLI or Terraform provider for chosen platform).
3. Metrics to watch: RPC latency, failed transaction broadcast count, error rate.
4. Send notifications via webhook (Slack/Discord) + optional email.

## Notification Targets

Configure recipients in a simple JSON manifest:
```json
{
  "alerts": {
    "critical": ["ops@celora.local"],
    "warning": ["dev@celora.local"],
    "info": ["logs@celora.local"]
  }
}
```

Legacy platform-specific action group references removed.

### Adding Notification Channels

1. Email: Add email addresses to receive alerts
2. SMS: Add phone numbers for critical alerts
3. Webhook: Configure webhooks for integration with PagerDuty, Slack, etc.

## Dashboards

### Creating Custom Dashboards

(Legacy dashboard instructions removed – use generic metrics dashboard tooling or custom panel)
2. Click **New Dashboard**
3. Add tiles for:
   - **Request Rate**: `requests/count`
   - **Error Rate**: `requests/failed` / `requests/count` * 100
   - **Response Time**: `requests/duration` (P50, P95, P99)
   - **Exception Rate**: `exceptions/count`
   - **Dependency Calls**: `dependencies/count` by type
   - **User Count**: `users/count`

### Recommended Dashboard Layout

```
┌─────────────────┬─────────────────┬─────────────────┐
│ Request Rate    │ Error Rate      │ Response Time   │
│ (Last 24h)      │ (Last 24h)      │ P95 (Last 1h)   │
├─────────────────┼─────────────────┼─────────────────┤
│ Exception Rate  │ Dependency Calls│ Active Users     │
│ (Last 24h)      │ (Last 1h)       │ (Last 24h)      │
├─────────────────┴─────────────────┴─────────────────┤
│ Recent Alerts (Last 24h)                          │
└───────────────────────────────────────────────────┘
```

## Log Queries

### Common Kusto Queries

#### Error Rate by Endpoint
```kusto
requests
| where timestamp > ago(1h)
| summarize 
    Total = count(),
    Failed = countif(success == false)
    by name
| extend ErrorRate = (Failed * 100.0) / Total
| where ErrorRate > 5
| order by ErrorRate desc
```

#### Slow API Endpoints
```kusto
requests
| where timestamp > ago(1h)
| where duration > 2000
| summarize 
    Count = count(),
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95)
    by name
| order by P95Duration desc
```

#### Database Query Performance
```kusto
dependencies
| where timestamp > ago(1h)
| where type == "SQL"
| summarize 
    Count = count(),
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95)
    by data
| where P95Duration > 1000
| order by P95Duration desc
```

#### Exception Trends
```kusto
exceptions
| where timestamp > ago(24h)
| summarize Count = count() by bin(timestamp, 1h), type
| render timechart
```

## Testing Alerts

### Manual Alert Testing

Use your monitoring platform's testing tools to validate alert rules trigger correctly when thresholds are exceeded.

### Simulating Issues

For testing purposes, you can temporarily:

1. **Simulate High Error Rate**: Temporarily break an API endpoint
2. **Simulate High Latency**: Add artificial delay to API responses
3. **Simulate Database Issues**: Temporarily disconnect database

⚠️ **Warning**: Only test in non-production environments!

## Alert Response Procedures

### When an Alert Fires

1. **Acknowledge**: Confirm receipt of alert
2. **Investigate**: Check monitoring platform logs and metrics
3. **Assess Impact**: Determine user impact and severity
4. **Resolve**: Fix the issue or implement workaround
5. **Document**: Record incident details and resolution

### Escalation Path

- **Warning Alerts**: Review within 1 hour
- **Critical Alerts**: Immediate response required
- **Informational Alerts**: Review during next business day

## Cost Optimization

### Sampling Configuration

Adjust sampling percentage based on traffic:

- **Development**: 100% sampling
- **Staging**: 50% sampling
- **Production**: 10-20% sampling

Configure in Application Insights:
```bash
# Via environment variable
APPLICATION_INSIGHTS_SAMPLING_PERCENTAGE=10
```

### Data Retention

- **Default**: 30 days (included in cost)
- **Extended**: Up to 730 days (additional cost)
- **Recommendation**: 30 days for production, 90 days for compliance

## Troubleshooting

### Alerts Not Firing

1. Check alert rule is enabled
2. Verify metric exists in Application Insights
3. Check action group is configured correctly
4. Review alert rule evaluation history

### False Positives

1. Adjust threshold values
2. Add additional filters to criteria
3. Increase evaluation window
4. Review alert frequency settings

### Missing Metrics

1. Verify telemetry SDK is properly configured
2. Check telemetry is being sent (review live metrics dashboard)
3. Verify sampling isn't filtering out all data
4. Check firewall rules allow telemetry endpoints

## Resources

- OpenTelemetry documentation for vendor-neutral instrumentation
- Prometheus alerting best practices
- Generic monitoring platform documentation (Datadog, Grafana, New Relic)

