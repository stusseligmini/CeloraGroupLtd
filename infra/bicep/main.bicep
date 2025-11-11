// ============================================================================
// Celora Main Infrastructure - Bicep Template
// Multi-region setup: Norway East (primary) + West Europe (secondary)
// ============================================================================

targetScope = 'subscription'

@description('Project name (used for resource naming)')
param projectName string = 'celora'

@description('Environment (prod, staging, dev)')
@allowed([
  'prod'
  'staging'
  'dev'
])
param environment string = 'prod'

@description('Primary region')
param primaryRegion string = 'norwayeast'

@description('Secondary region for disaster recovery')
param secondaryRegion string = 'westeurope'

@description('PostgreSQL administrator username')
param postgresAdminUsername string = 'celoraadmin'

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Project: projectName
  ManagedBy: 'Bicep'
}

// ============================================================================
// PRIMARY REGION DEPLOYMENT
// ============================================================================
module primaryRegion 'modules/regionCore.bicep' = {
  name: 'deploy-${projectName}-${environment}-primary'
  scope: subscription()
  params: {
    projectName: projectName
    environment: environment
    location: primaryRegion
    regionLabel: 'primary'
    postgresAdminUsername: postgresAdminUsername
    postgresAdminPassword: postgresAdminPassword
    tags: tags
  }
}

// ============================================================================
// SECONDARY REGION DEPLOYMENT
// ============================================================================
module secondaryRegion 'modules/regionCore.bicep' = {
  name: 'deploy-${projectName}-${environment}-secondary'
  scope: subscription()
  params: {
    projectName: projectName
    environment: environment
    location: secondaryRegion
    regionLabel: 'secondary'
    postgresAdminUsername: postgresAdminUsername
    postgresAdminPassword: postgresAdminPassword
    tags: tags
  }
}

// ============================================================================
// GLOBAL SERVICES (Front Door, Monitoring)
// ============================================================================
module frontDoor 'modules/frontDoor.bicep' = {
  name: 'deploy-${projectName}-${environment}-frontdoor'
  scope: resourceGroup(primaryRegion.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    primaryEndpoint: primaryRegion.outputs.webAppHostname
    secondaryEndpoint: secondaryRegion.outputs.webAppHostname
    customDomain: 'app.celora.com'
    tags: tags
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'deploy-${projectName}-${environment}-monitoring'
  scope: resourceGroup(primaryRegion.outputs.resourceGroupName)
  params: {
    projectName: projectName
    environment: environment
    location: primaryRegion
    primaryWorkspaceId: primaryRegion.outputs.logAnalyticsWorkspaceId
    secondaryWorkspaceId: secondaryRegion.outputs.logAnalyticsWorkspaceId
    tags: tags
  }
}

// ============================================================================
// OUTPUTS
// ============================================================================
output primaryResourceGroupName string = primaryRegion.outputs.resourceGroupName
output secondaryResourceGroupName string = secondaryRegion.outputs.resourceGroupName
output primaryWebAppUrl string = 'https://${primaryRegion.outputs.webAppHostname}'
output secondaryWebAppUrl string = 'https://${secondaryRegion.outputs.webAppHostname}'
output frontDoorEndpoint string = frontDoor.outputs.frontDoorEndpoint
output applicationInsightsInstrumentationKey string = monitoring.outputs.instrumentationKey
output primaryPostgresHost string = primaryRegion.outputs.postgresHost
output secondaryPostgresHost string = secondaryRegion.outputs.postgresHost
