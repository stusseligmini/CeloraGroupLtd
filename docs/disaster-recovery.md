# Disaster Recovery Runbook

This runbook provides step-by-step procedures for disaster recovery scenarios in Celora.

## Overview

Celora's disaster recovery strategy includes:

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Backup Frequency**: Daily database backups, continuous transaction log backups
- **Backup Retention**: 30 days

## Pre-Incident Preparation

### Backup Verification

**Frequency**: Weekly

**Procedure**:

1. Verify database backups are running:
   ```bash
   az postgres flexible-server backup list \
     --resource-group celora-rg \
     --server-name celora-db
   ```

2. Test backup restoration in staging environment
3. Verify Application Insights data retention
4. Check Azure Key Vault backup status

### Contact Information

**On-Call Engineer**: [Contact Info]
**Database Administrator**: [Contact Info]
**Azure Support**: [Support Ticket Number]
**Emergency Escalation**: [Contact Info]

## Recovery Scenarios

### Scenario 1: Database Corruption or Data Loss

**Symptoms**:
- Application errors related to database
- Data inconsistencies reported by users
- Database connection failures

**Recovery Procedure**:

1. **Assess Damage**:
   ```bash
   # Check database status
   az postgres flexible-server show \
     --resource-group celora-rg \
     --name celora-db
   ```

2. **Stop Application** (if needed):
   ```bash
   az webapp stop --name celora-webapp --resource-group celora-rg
   ```

3. **Restore from Backup**:
   ```bash
   # List available backups
   az postgres flexible-server backup list \
     --resource-group celora-rg \
     --server-name celora-db
   
   # Restore to new server (point-in-time restore)
   az postgres flexible-server restore \
     --resource-group celora-rg \
     --name celora-db-restored \
     --source-server celora-db \
     --restore-time "2024-01-15T10:00:00Z"
   ```

4. **Update Connection Strings**:
   - Update `DATABASE_URL` in Azure App Service
   - Update CI/CD pipeline variables
   - Update local `.env.local` files

5. **Run Database Migrations**:
   ```bash
   npm run db:migrate:deploy
   ```

6. **Verify Data Integrity**:
   ```bash
   # Run data integrity checks
   npm run db:verify
   ```

7. **Restart Application**:
   ```bash
   az webapp restart --name celora-webapp --resource-group celora-rg
   ```

8. **Monitor**:
   - Check Application Insights for errors
   - Verify health check endpoint
   - Monitor user reports

**Estimated Recovery Time**: 2-4 hours

### Scenario 2: Application Service Failure

**Symptoms**:
- Application returns 5xx errors
- Health check endpoint fails
- No response from application

**Recovery Procedure**:

1. **Check Application Status**:
   ```bash
   az webapp show --name celora-webapp --resource-group celora-rg
   ```

2. **Review Logs**:
   ```bash
   az webapp log tail --name celora-webapp --resource-group celora-rg
   ```

3. **Restart Application**:
   ```bash
   az webapp restart --name celora-webapp --resource-group celora-rg
   ```

4. **If Restart Fails - Redeploy**:
   ```bash
   # Download latest build artifact
   az pipelines runs artifact download \
     --organization https://dev.azure.com/celora \
     --project celora \
     --run-id <latest-run-id> \
     --artifact-name celora-pwa
   
   # Deploy to App Service
   az webapp deployment source config-zip \
     --resource-group celora-rg \
     --name celora-webapp \
     --src celora-pwa.tgz
   ```

5. **Verify**:
   - Check health endpoint: `https://celora.azurewebsites.net/api/diagnostics/health`
   - Monitor Application Insights
   - Test critical user flows

**Estimated Recovery Time**: 30 minutes - 2 hours

### Scenario 3: Regional Azure Outage

**Symptoms**:
- Complete service unavailability
- Azure Portal shows service degradation
- Multiple Azure services affected

**Recovery Procedure**:

1. **Activate Secondary Region** (if configured):
   ```bash
   # Switch traffic to secondary region
   az front-door frontend-endpoint update \
     --resource-group celora-rg \
     --front-door-name celora-fd \
     --name default \
     --backend-pool-name secondary-region
   ```

2. **If No Secondary Region - Wait for Azure Recovery**:
   - Monitor Azure Status page
   - Communicate with users via status page
   - Prepare for post-incident review

3. **Post-Recovery Verification**:
   - Verify all services are operational
   - Check data consistency
   - Review Application Insights for errors

**Estimated Recovery Time**: 2-6 hours (depends on Azure)

### Scenario 4: Security Breach

**Symptoms**:
- Unusual authentication patterns
- Unauthorized access detected
- Security alerts from Azure Security Center

**Recovery Procedure**:

1. **Immediate Actions**:
   - Rotate all secrets immediately
   - Revoke compromised credentials
   - Enable additional security logging

2. **Assess Impact**:
   - Review audit logs for unauthorized access
   - Identify compromised data
   - Determine attack vector

3. **Containment**:
   - Block suspicious IP addresses in WAF
   - Temporarily disable affected features
   - Isolate compromised systems

4. **Notification**:
   - Notify security team
   - Document incident details
   - Prepare user notification (if required by law)

5. **Recovery**:
   - Restore from clean backup (if needed)
   - Re-encrypt affected data
   - Update security configurations

6. **Post-Incident**:
   - Conduct security review
   - Update security procedures
   - Implement additional safeguards

**Estimated Recovery Time**: 4-24 hours

### Scenario 5: Data Center Failure

**Symptoms**:
- Complete regional unavailability
- Azure datacenter outage
- No connectivity to primary region

**Recovery Procedure**:

1. **Failover to Secondary Region** (if available):
   - Activate secondary deployment
   - Update DNS/Front Door configuration
   - Restore database from backup

2. **If No Secondary Region**:
   - Wait for Azure recovery
   - Communicate status to users
   - Prepare for extended downtime

**Estimated Recovery Time**: 4-12 hours

## Database Backup and Restore

### Manual Backup

```bash
# Create manual backup
az postgres flexible-server backup create \
  --resource-group celora-rg \
  --server-name celora-db \
  --backup-name manual-backup-$(date +%Y%m%d)
```

### Point-in-Time Restore

```bash
# Restore to specific point in time
az postgres flexible-server restore \
  --resource-group celora-rg \
  --name celora-db-restored \
  --source-server celora-db \
  --restore-time "2024-01-15T10:00:00Z"
```

### Export Database

```bash
# Export database to SQL file
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Import Database

```bash
# Import from SQL file
psql $DATABASE_URL < backup-20240115.sql
```

## Application Rollback

### Rollback to Previous Deployment

1. **Identify Previous Deployment**:
   ```bash
   az webapp deployment list \
     --resource-group celora-rg \
     --name celora-webapp
   ```

2. **Rollback**:
   ```bash
   az webapp deployment slot swap \
     --resource-group celora-rg \
     --name celora-webapp \
     --slot staging \
     --target-slot production
   ```

### Rollback Database Schema

```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back <migration-name>
npx prisma migrate deploy
```

## Communication Plan

### Internal Communication

1. **Immediate**: Notify on-call engineer
2. **Within 1 hour**: Notify engineering team
3. **Within 2 hours**: Notify management

### External Communication

1. **Status Page**: Update status.celora.com
2. **Social Media**: Post updates on Twitter/LinkedIn
3. **Email**: Notify affected users (if required)

### Status Page Template

```
[INCIDENT] Celora Service Disruption

Status: Investigating
Started: [Time]
Affected Services: [Services]
Impact: [Description]

We are currently investigating an issue affecting [services]. 
We will provide updates every 30 minutes.

Update 1 (Time): [Status update]
```

## Post-Incident Review

### Incident Report Template

1. **Incident Summary**
   - Date and time
   - Duration
   - Affected services
   - Root cause

2. **Impact Assessment**
   - Number of users affected
   - Data loss (if any)
   - Financial impact

3. **Recovery Actions**
   - Steps taken
   - Time to recovery
   - Lessons learned

4. **Preventive Measures**
   - Changes to prevent recurrence
   - Process improvements
   - Additional monitoring

### Review Meeting

**Frequency**: Within 1 week of incident

**Attendees**:
- Engineering team
- Operations team
- Management

**Agenda**:
1. Incident timeline
2. Root cause analysis
3. Recovery procedures review
4. Action items

## Testing Disaster Recovery

### Quarterly DR Drill

**Procedure**:

1. Schedule DR drill (announce in advance)
2. Simulate database failure scenario
3. Execute recovery procedures
4. Measure recovery time
5. Document findings
6. Update runbook based on learnings

### Backup Restoration Test

**Frequency**: Monthly

**Procedure**:

1. Restore database backup to staging
2. Verify data integrity
3. Test application functionality
4. Document any issues

## Resources

- [Azure Backup Documentation](https://docs.microsoft.com/azure/backup/)
- [Azure Site Recovery](https://docs.microsoft.com/azure/site-recovery/)
- [PostgreSQL Backup and Restore](https://docs.microsoft.com/azure/postgresql/flexible-server/concepts-backup-restore)

