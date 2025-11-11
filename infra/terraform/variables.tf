variable "project_name" {
  description = "Short name used for tagging and resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (e.g. prod, staging)."
  type        = string
}

variable "regions" {
  description = "Map of deployment regions with role metadata."
  type = object({
    primary = object({
      location          = string
      geo_pair_location = string
    })
    secondary = object({
      location          = string
      geo_pair_location = string
    })
  })
}

variable "aad_b2c" {
  description = "Azure AD B2C configuration inputs."
  type = object({
    tenant_name        = string
    display_name       = string
    domain_name        = string
    app_spa_reply_urls = list(string)
    api_app_identifier = string
  })
}

variable "state_resource_group" {
  description = "Resource group hosting the Terraform state storage account."
  type        = string
}

variable "state_storage_account" {
  description = "Storage account used for Terraform remote state."
  type        = string
}

variable "state_container_name" {
  description = "Blob container used to persist Terraform state files."
  type        = string
}

variable "state_key" {
  description = "Blob key for this environment's state file."
  type        = string
}

variable "azuread_tenant_id" {
  description = "Azure AD tenant ID that owns the subscription."
  type        = string
}

variable "postgres" {
  description = "Azure Database for PostgreSQL configuration options."
  type = object({
    sku_name            = string
    storage_mb          = number
    backup_retention_days = number
    administrator_login = string
    administrator_password = string
    version             = string
  })
  sensitive = true
}

variable "aks" {
  description = "AKS cluster sizing + networking configuration."
  type = object({
    kubernetes_version = string
    system_node_pool = object({
      vm_size   = string
      node_count = number
      max_count  = number
      min_count  = number
    })
    user_node_pool = object({
      vm_size    = string
      node_count = number
      max_count  = number
      min_count  = number
    })
    network = object({
      vnet_cidr        = string
      aks_subnet_cidr  = string
      app_subnet_cidr  = string
      private_dns_zone = string
    })
  })
}

variable "redis" {
  description = "Azure Cache for Redis sizing."
  type = object({
    sku_name     = string
    capacity     = number
    family       = string
    enable_tls   = bool
  })
}

variable "storage" {
  description = "Storage account configuration."
  type = object({
    account_tier             = string
    account_replication_type = string
    enable_static_website    = bool
  })
}

variable "front_door" {
  description = "Azure Front Door configuration for global entry."
  type = object({
    custom_domain_hostnames = list(string)
    enable_waf              = bool
  })
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}

variable "azure_devops_organization_url" {
  description = "Azure DevOps organization URL (https://dev.azure.com/ORG)."
  type        = string
}

variable "azure_devops_pat" {
  description = "Azure DevOps personal access token with project/service connection rights."
  type        = string
  sensitive   = true
}

variable "azure_devops_spn_app_id" {
  description = "Service Principal application ID for Azure DevOps service connection."
  type        = string
}

variable "azure_devops_spn_secret" {
  description = "Service Principal client secret for Azure DevOps service connection."
  type        = string
  sensitive   = true
}

variable "azure_subscription_id" {
  description = "Azure subscription ID for infrastructure deployment."
  type        = string
}

variable "azure_subscription_name" {
  description = "Azure subscription name (for reference in service connection)."
  type        = string
}

