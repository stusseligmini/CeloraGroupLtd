# Monitoring & Alerting Setup Guide

This guide covers the setup and configuration of Azure Monitor alerts and dashboards for Celora.

## Overview

Celora uses Azure Application Insights for application monitoring and Azure Monitor for alerting. The monitoring infrastructure is defined in:

- **Terraform**: `infra/terraform/modules/global-monitoring/`
- **Bicep**: `infra/bicep/modules/monitoring.bicep`

## Prerequisites

1. Azure Application Insights resource created
2. Azure Monitor Action Group configured with notification channels
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

### Using Azure Portal

1. Navigate to **Azure Monitor** > **Alerts**
2. Click **Create** > **Alert rule**
3. Select your Application Insights resource
4. Configure metric, threshold, and action group
5. Save the alert rule

## Action Groups

Action Groups define who gets notified when alerts fire. Configure in:

- **Terraform**: `infra/terraform/modules/global-monitoring/main.tf` (action_group resource)
- **Azure Portal**: Azure Monitor > Action groups

### Adding Notification Channels

1. Email: Add email addresses to receive alerts
2. SMS: Add phone numbers for critical alerts
3. Webhook: Configure webhooks for integration with PagerDuty, Slack, etc.
4. Azure Function: Trigger serverless functions for automated responses

## Dashboards

### Creating Custom Dashboards

1. Navigate to **Azure Portal** > **Application Insights** > **Dashboards**
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

1. Navigate to **Azure Monitor** > **Alerts**
2. Select an alert rule
3. Click **Test** or **Run query**
4. Verify alert fires when threshold is exceeded

### Simulating Issues

For testing purposes, you can temporarily:

1. **Simulate High Error Rate**: Temporarily break an API endpoint
2. **Simulate High Latency**: Add artificial delay to API responses
3. **Simulate Database Issues**: Temporarily disconnect database

⚠️ **Warning**: Only test in non-production environments!

## Alert Response Procedures

### When an Alert Fires

1. **Acknowledge**: Confirm receipt of alert
2. **Investigate**: Check Application Insights logs and metrics
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

1. Verify Application Insights SDK is properly configured
2. Check telemetry is being sent (review Live Metrics)
3. Verify sampling isn't filtering out all data
4. Check firewall rules allow Application Insights endpoints

## Resources

- [Azure Monitor Documentation](https://docs.microsoft.com/azure/azure-monitor/)
- [Application Insights Kusto Queries](https://docs.microsoft.com/azure/azure-monitor/logs/kusto/query/)
- [Alert Rule Best Practices](https://docs.microsoft.com/azure/azure-monitor/alerts/alerts-overview)

