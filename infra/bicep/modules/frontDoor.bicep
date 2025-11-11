@description('Project name used for naming.')
param projectName string

@description('Environment identifier.')
param environment string

@description('Common resource tags.')
param tags object

@description('Origin map with primary/secondary hosts.')
param origins object

var namePrefix = '${projectName}-${environment}'

resource profile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: 'fd-${namePrefix}'
  location: 'global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  tags: tags
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  name: 'ep-${namePrefix}'
  parent: profile
  properties: {
    enabledState: 'Enabled'
  }
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  name: 'og-${namePrefix}'
  parent: profile
  properties: {
    healthProbeSettings: {
      probeIntervalInSeconds: 30
      probePath: '/health/edge'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
    }
    loadBalancingSettings: {
      additionalLatencyInMilliseconds: 0
      sampleSize: 4
      successfulSamplesRequired: 3
    }
  }
}

resource originPrimary 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  name: 'origin-primary'
  parent: originGroup
  properties: {
    hostName: origins.primary.host
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 100
    enabledState: 'Enabled'
  }
}

resource originSecondary 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  name: 'origin-secondary'
  parent: originGroup
  properties: {
    hostName: origins.secondary.host
    httpPort: 80
    httpsPort: 443
    priority: 2
    weight: 50
    enabledState: 'Enabled'
  }
}

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  name: 'route-${namePrefix}'
  parent: endpoint
  properties: {
    supportedProtocols: [ 'Http', 'Https' ]
    httpsRedirect: 'Enabled'
    originGroup: {
      id: originGroup.id
    }
    ruleSets: []
    forwardingProtocol: 'MatchRequest'
    linkToDefaultDomain: 'Enabled'
    patternsToMatch: [ '/*' ]
  }
}

output frontDoorHost string = 'https://${endpoint.properties.hostName}'
