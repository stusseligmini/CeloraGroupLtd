# Security Hardening Guide

This guide covers security hardening procedures for Celora, including secret rotation, WAF configuration, and audit log review.

## Overview

Celora implements multiple layers of security:

1. **Encryption**: At-rest and in-transit encryption
2. **Authentication**: Azure AD B2C with JWT verification
3. **Network Security**: WAF, DDoS protection, rate limiting
4. **Secrets Management**: Azure Key Vault
5. **Audit Logging**: Comprehensive audit trail

## Secret Rotation

### Encryption Keys

**Rotation Frequency**: Quarterly (every 3 months)

**Keys to Rotate**:
- `MASTER_ENCRYPTION_KEY` - Master encryption key for sensitive data
- `WALLET_ENCRYPTION_KEY` - Wallet private key encryption
- `SESSION_COOKIE_SECRET` - Session cookie signing

**Procedure**:

1. **Generate New Keys**:
   ```bash
   # Generate 64-character hex key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Store in Azure Key Vault**:
   ```bash
   az keyvault secret set \
     --vault-name celora-keyvault \
     --name MASTER_ENCRYPTION_KEY \
     --value <new-key>
   ```

3. **Update Environment Variables**:
   - Update `.env.local` for local development
   - Update Azure App Service configuration
   - Update CI/CD pipeline variables

4. **Re-encrypt Existing Data** (if needed):
   ```typescript
   // Run migration script to re-encrypt data with new key
   npm run db:migrate:reencrypt
   ```

5. **Verify**:
   - Test encryption/decryption with new key
   - Verify existing data can still be decrypted
   - Monitor for errors in Application Insights

### API Keys

**Rotation Frequency**: Monthly

**Keys to Rotate**:
- Card provider API keys (Gnosis Pay, Highnote)
- Blockchain RPC API keys
- Telegram bot token
- Payment processor webhook secrets

**Procedure**:

1. **Generate New API Key** from provider
2. **Update in Azure Key Vault**:
   ```bash
   az keyvault secret set \
     --vault-name celora-keyvault \
     --name GNOSIS_PAY_API_KEY \
     --value <new-key>
   ```

3. **Update Application Configuration**:
   - Update environment variables
   - Restart application services

4. **Verify**:
   - Test API calls with new key
   - Monitor for authentication errors
   - Keep old key active for 24 hours (grace period)

5. **Revoke Old Key** after verification

### Database Passwords

**Rotation Frequency**: Quarterly

**Procedure**:

1. **Generate New Password**:
   ```bash
   # Generate strong password
   openssl rand -base64 32
   ```

2. **Update Azure Database for PostgreSQL**:
   ```bash
   az postgres flexible-server update \
     --resource-group celora-rg \
     --name celora-db \
     --admin-password <new-password>
   ```

3. **Update Connection Strings**:
   - Update `DATABASE_URL` in Azure Key Vault
   - Update App Service configuration
   - Update CI/CD pipeline variables

4. **Restart Application**:
   ```bash
   az webapp restart --name celora-webapp --resource-group celora-rg
   ```

5. **Verify**:
   - Check application logs for connection errors
   - Run health check endpoint
   - Verify database queries succeed

## WAF (Web Application Firewall) Configuration

### Azure Front Door WAF

**Location**: `infra/terraform/modules/frontDoor/waf.tf` or Azure Portal

### WAF Rules

#### 1. OWASP Core Rule Set

Enable OWASP 3.2 Core Rule Set:

```hcl
resource "azurerm_frontdoor_firewall_policy" "waf" {
  name                = "waf-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name

  enabled = true

  custom_rule {
    name     = "OWASP-CRS"
    priority = 1
    rule_type = "MatchRule"
    action   = "Block"

    match_conditions {
      match_variable     = "RequestUri"
      operator          = "Contains"
      match_values      = ["/api/"]
    }
  }
}
```

#### 2. Rate Limiting

Configure rate limiting per IP:

```hcl
custom_rule {
  name     = "RateLimit"
  priority = 2
  rule_type = "RateLimitRule"
  rate_limit_duration_in_minutes = 1
  rate_limit_threshold = 100

  match_conditions {
    match_variable = "RemoteAddr"
    operator      = "IPMatch"
  }
}
```

#### 3. Geo-blocking (Optional)

Block traffic from specific countries:

```hcl
custom_rule {
  name     = "GeoBlock"
  priority = 3
  rule_type = "MatchRule"
  action   = "Block"

  match_conditions {
    match_variable = "RemoteAddr"
    operator      = "GeoMatch"
    match_values   = ["CN", "RU"] # Block China and Russia
  }
}
```

### WAF Monitoring

Monitor WAF logs in Azure Monitor:

```kusto
AzureDiagnostics
| where Category == "FrontDoorWebApplicationFirewallLog"
| where action_s == "Block"
| summarize count() by clientIp_s, ruleName_s
| order by count_ desc
```

## DDoS Protection

### Azure DDoS Protection Standard

**Configuration**:

1. Enable DDoS Protection Standard on Virtual Network
2. Configure DDoS alerts in Azure Monitor
3. Set up auto-scaling to handle traffic spikes

**Alert Configuration**:

```hcl
resource "azurerm_monitor_metric_alert" "ddos_attack" {
  name                = "alert-ddos-attack"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_public_ip.main.id]

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "DDoSTriggerTCPProtocol"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }
}
```

## Audit Log Review

### Audit Log Sources

1. **Application Logs**: Application Insights
2. **Database Logs**: PostgreSQL audit logs
3. **Authentication Logs**: Azure AD B2C sign-in logs
4. **API Access Logs**: Application Insights requests
5. **Security Events**: Azure Security Center

### Weekly Review Checklist

**Review Frequency**: Every Monday

**Checklist**:

1. **Failed Authentication Attempts**
   ```kusto
   signinLogs
   | where TimeGenerated > ago(7d)
   | where ResultType != 0
   | summarize count() by UserPrincipalName, IPAddress
   | where count_ > 5
   ```

2. **Unusual API Access Patterns**
   ```kusto
   requests
   | where timestamp > ago(7d)
   | where success == false
   | summarize count() by client_IP, name
   | where count_ > 100
   ```

3. **Privileged Operations**
   - Wallet creation
   - Card creation
   - Multisig wallet operations
   - Recovery operations

4. **Database Access**
   - Unusual query patterns
   - Failed connection attempts
   - Long-running queries

5. **Security Alerts**
   - Review Azure Security Center alerts
   - Investigate any high-severity findings

### Automated Alerting

Configure alerts for suspicious activity:

```kusto
// Alert: Multiple failed login attempts
signinLogs
| where TimeGenerated > ago(1h)
| where ResultType != 0
| summarize FailedAttempts = count() by UserPrincipalName, IPAddress, bin(TimeGenerated, 5m)
| where FailedAttempts > 10
```

### Audit Log Retention

- **Application Logs**: 30 days (Application Insights)
- **Database Logs**: 90 days (PostgreSQL)
- **Authentication Logs**: 90 days (Azure AD B2C)
- **Security Events**: 1 year (Azure Security Center)

## Security Best Practices

### 1. Principle of Least Privilege

- Grant minimum required permissions
- Use managed identities where possible
- Rotate service principal credentials regularly

### 2. Defense in Depth

- Multiple layers of security (WAF, rate limiting, authentication)
- Encrypt data at rest and in transit
- Implement network segmentation

### 3. Regular Security Audits

- Quarterly security reviews
- Annual penetration testing
- Continuous vulnerability scanning

### 4. Incident Response

- Document incident response procedures
- Maintain security contact list
- Practice incident response drills

## Secret Rotation Script Template

Create `scripts/rotate-secrets.sh`:

```bash
#!/bin/bash
# Secret Rotation Script Template

set -euo pipefail

KEY_VAULT_NAME="celora-keyvault"
RESOURCE_GROUP="celora-rg"

# Function to rotate a secret
rotate_secret() {
  local secret_name=$1
  local new_value=$2
  
  echo "Rotating secret: $secret_name"
  
  # Store new secret in Key Vault
  az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --value "$new_value"
  
  # Update App Service configuration
  az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name celora-webapp \
    --settings "$secret_name=$new_value"
  
  echo "Secret $secret_name rotated successfully"
}

# Example: Rotate master encryption key
# NEW_KEY=$(openssl rand -hex 32)
# rotate_secret "MASTER_ENCRYPTION_KEY" "$NEW_KEY"
```

## Compliance

### PCI DSS (if handling card data)

- Encrypt card data at rest (AES-256)
- Use TLS 1.2+ for data in transit
- Implement access controls and audit logging
- Regular security testing

### GDPR

- Encrypt personal data
- Implement data retention policies
- Provide data export/deletion capabilities
- Document data processing activities

## Resources

- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [Azure WAF Documentation](https://docs.microsoft.com/azure/web-application-firewall/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Azure Security Best Practices](https://docs.microsoft.com/azure/security/fundamentals/best-practices-and-patterns)

