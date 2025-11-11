// ============================================================================
// Region Core Module - Complete regional infrastructure
// Includes: Resource Group, VNet, App Service, PostgreSQL, Redis, Key Vault
// ============================================================================

targetScope = 'subscription'

@description('Project name used for resource naming.')
param projectName string

@description('Deployment environment.')
param environment string

@description('Region label (primary/secondary).')
param regionLabel string

@description('Azure location for this deployment.')
param location string

@description('Common resource tags.')
param tags object

@description('PostgreSQL administrator username')
param postgresAdminUsername string

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

var namePrefix = '${projectName}-${environment}-${regionLabel}'
var resourceGroupName = 'rg-${namePrefix}'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namePrefix}'
  location: location
  tags: tags
}

// ============================================================================
// LOG ANALYTICS WORKSPACE
// ============================================================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${namePrefix}'
  location: location
  scope: resourceGroup(resourceGroupName)
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
  tags: tags
  dependsOn: [
    rg
  ]
}

// ============================================================================
// APP SERVICE PLAN
// ============================================================================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${namePrefix}'
  location: location
  scope: resourceGroup(resourceGroupName)
  sku: {
    name: 'P1v3'
    tier: 'PremiumV3'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
  tags: tags
  dependsOn: [
    rg
  ]
}

// ============================================================================
// WEB APP (Next.js)
// ============================================================================
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: 'app-${namePrefix}'
  location: location
  scope: resourceGroup(resourceGroupName)
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '20-lts'
        }
        {
          name: 'NODE_ENV'
          value: environment
        }
      ]
    }
  }
  tags: tags
  dependsOn: [
    rg
    appServicePlan
  ]
}

// ============================================================================
// POSTGRESQL FLEXIBLE SERVER
// ============================================================================
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: 'pg-${namePrefix}'
  location: location
  scope: resourceGroup(resourceGroupName)
  sku: {
    name: 'Standard_D4s_v3'
    tier: 'GeneralPurpose'
  }
  properties: {
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: {
      storageSizeGB: 128
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
  tags: tags
  dependsOn: [
    rg
  ]
}

// PostgreSQL Database
resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  name: 'celora_${environment}'
  parent: postgres
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ============================================================================
// REDIS CACHE
// ============================================================================
resource redis 'Microsoft.Cache/Redis@2023-08-01' = {
  name: 'redis-${namePrefix}'
  location: location
  scope: resourceGroup(resourceGroupName)
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
  tags: tags
  dependsOn: [
    rg
  ]
}

// ============================================================================
// KEY VAULT
// ============================================================================
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${take(replace(namePrefix, '-', ''), 24)}'
  location: location
  scope: resourceGroup(resourceGroupName)
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
  tags: tags
  dependsOn: [
    rg
  ]
}

// ============================================================================
// STORAGE ACCOUNT
// ============================================================================
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'st${toLower(replace(namePrefix, '-', ''))}'
  location: location
  scope: resourceGroup(resourceGroupName)
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
  tags: tags
  dependsOn: [
    rg
  ]
}

// ============================================================================
// OUTPUTS
// ============================================================================
output resourceGroupName string = rg.name
output logAnalyticsWorkspaceId string = logAnalytics.id
output webAppName string = webApp.name
output webAppHostname string = webApp.properties.defaultHostName
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output redisHost string = redis.properties.hostName
output keyVaultUri string = keyVault.properties.vaultUri
output storageAccountName string = storage.name
