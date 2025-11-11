locals {
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
    },
    var.tags
  )
}

module "region_core" {
  for_each = {
    primary   = var.regions.primary
    secondary = var.regions.secondary
  }

  source = "./modules/region-core"

  project_name         = var.project_name
  environment          = var.environment
  region_key           = each.key
  location             = each.value.location
  geo_pair_location    = each.value.geo_pair_location
  tags                 = local.common_tags
  aks                  = var.aks
  postgres             = var.postgres
  redis                = var.redis
  storage              = var.storage
  aad_b2c_tenant_name  = var.aad_b2c.tenant_name
}

module "global_frontdoor" {
  source = "./modules/global-frontdoor"

  project_name           = var.project_name
  environment            = var.environment
  regions                = { for k, v in var.regions : k => { location = v.location } }
  tags                   = local.common_tags
  custom_domain_hostnames = var.front_door.custom_domain_hostnames
  enable_waf             = var.front_door.enable_waf
  origin_endpoints = {
    primary = {
      host       = module.region_core["primary"].aks_cluster_fqdn
      https_port = 443
      http_port  = 80
    }
    secondary = {
      host       = module.region_core["secondary"].aks_cluster_fqdn
      https_port = 443
      http_port  = 80
    }
  }
}

module "global_monitoring" {
  source = "./modules/global-monitoring"

  project_name    = var.project_name
  environment     = var.environment
  tags            = local.common_tags
  log_analytics_ids = {
    for k, mod in module.region_core : k => mod.log_analytics_id
  }
}

module "azure_ad_b2c" {
  source  = "git::https://github.com/pagopa/terraform-azurerm-azuread-b2c.git?ref=v0.4.0"

  display_name              = var.aad_b2c.display_name
  domain_name               = var.aad_b2c.domain_name
  tenant_name               = var.aad_b2c.tenant_name
  app_spa_reply_urls        = var.aad_b2c.app_spa_reply_urls
  app_api_identifier_uri    = var.aad_b2c.api_app_identifier
  tags                      = local.common_tags
}

resource "azuredevops_project" "platform" {
  name       = "${upper(var.project_name)}-${upper(var.environment)}"
  description = "Celora Azure multi-region platform"
  visibility = "private"
  version_control = "Git"
  work_item_template = "Agile"
}

resource "azuredevops_serviceendpoint_azurerm" "connection" {
  project_id            = azuredevops_project.platform.id
  service_endpoint_name = "Azure-${var.environment}"
  description           = "Azure subscription connection for Celora"
  credentials {
    serviceprincipalid  = var.azure_devops_spn_app_id
    serviceprincipalkey = var.azure_devops_spn_secret
    tenantid            = var.azuread_tenant_id
  }
  azurerm_spn_tenantid = var.azuread_tenant_id
  azurerm_subscription_id = var.azure_subscription_id
  azurerm_subscription_name = var.azure_subscription_name
}

