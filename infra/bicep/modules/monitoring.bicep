@description('Project name')
param projectName string

@description('Environment identifier')
param environment string

@description('Common tags')
param tags object

@description('Log Analytics workspace IDs from regional deployments')
param logAnalyticsIds array

var namePrefix = '${projectName}-${environment}'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namePrefix}-monitoring'
  location: 'westeurope'
  tags: tags
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${namePrefix}'
  location: 'westeurope'
  resourceGroupName: rg.name
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    IngestionMode: 'LogAnalytics'
    WorkspaceResourceId: logAnalyticsIds[0]
  }
  tags: tags
}

output appInsightsConnectionString string = appInsights.properties.ConnectionString
