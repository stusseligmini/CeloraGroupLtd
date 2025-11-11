locals {
  name_prefix = "${var.project_name}-${var.environment}-${var.region_key}"
}

resource "azurerm_resource_group" "core" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = var.tags
}

resource "azurerm_log_analytics_workspace" "observability" {
  name                = "log-${local.name_prefix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.core.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_storage_account" "shared" {
  name                     = replace("st${local.name_prefix}", "-", "")
  resource_group_name      = azurerm_resource_group.core.name
  location                 = var.location
  account_tier             = var.storage.account_tier
  account_replication_type = var.storage.account_replication_type
  min_tls_version          = "TLS1_2"
  enable_https_traffic_only = true
  allow_nested_items_to_be_public = false
  tags = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

resource "azurerm_virtual_network" "hub" {
  name                = "vnet-${local.name_prefix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.core.name
  address_space       = [var.aks.network.vnet_cidr]
  tags                = var.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "snet-aks-${var.region_key}"
  resource_group_name  = azurerm_resource_group.core.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = [var.aks.network.aks_subnet_cidr]
  enforce_private_link_endpoint_network_policies = true
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app-${var.region_key}"
  resource_group_name  = azurerm_resource_group.core.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = [var.aks.network.app_subnet_cidr]
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = var.aks.network.private_dns_zone
  resource_group_name = azurerm_resource_group.core.name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "dnslink-${local.name_prefix}"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.core.name
  virtual_network_id    = azurerm_virtual_network.hub.id
}

resource "azurerm_key_vault" "main" {
  name                        = "kv-${local.name_prefix}"
  location                    = var.location
  resource_group_name         = azurerm_resource_group.core.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  public_network_access_enabled = false
  enable_rbac_authorization   = true
  tags                        = var.tags
}

data "azurerm_client_config" "current" {}

resource "azurerm_managed_identity" "aks" {
  name                = "mi-${local.name_prefix}-aks"
  location            = var.location
  resource_group_name = azurerm_resource_group.core.name
  tags                = var.tags
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${local.name_prefix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.core.name
  dns_prefix          = "aks-${var.project_name}-${var.region_key}"

  kubernetes_version = var.aks.kubernetes_version

  default_node_pool {
    name       = "system"
    vm_size    = var.aks.system_node_pool.vm_size
    node_count = var.aks.system_node_pool.node_count
    min_count  = var.aks.system_node_pool.min_count
    max_count  = var.aks.system_node_pool.max_count
    vnet_subnet_id = azurerm_subnet.aks.id
    enable_auto_scaling = true
    orchestrator_version = var.aks.kubernetes_version
    mode = "System"
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_managed_identity.aks.id]
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = "azure"
    load_balancer_sku  = "standard"
    outbound_type      = "userAssignedNATGateway"
  }

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled = true
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "pg-${local.name_prefix}"
  resource_group_name    = azurerm_resource_group.core.name
  location               = var.location
  sku_name               = var.postgres.sku_name
  storage_mb             = var.postgres.storage_mb
  version                = var.postgres.version
  administrator_login    = var.postgres.administrator_login
  administrator_password = var.postgres.administrator_password
  backup_retention_days  = var.postgres.backup_retention_days
  high_availability {
    mode                      = var.region_key == "primary" ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = var.region_key == "primary" ? "2" : null
  }
  maintenance_window {
    day_of_week  = 0
    hour_of_day  = 0
    minute_of_hour = 0
  }
  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "${var.project_name}_${var.environment}"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

resource "azurerm_redis_cache" "main" {
  name                = "redis-${local.name_prefix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.core.name
  capacity            = var.redis.capacity
  family              = var.redis.family
  sku_name            = var.redis.sku_name
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  tags                = var.tags
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_resource_group.core.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_managed_identity.aks.principal_id
}

resource "azurerm_monitor_diagnostic_setting" "aks" {
  name               = "diag-${local.name_prefix}-aks"
  target_resource_id = azurerm_kubernetes_cluster.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.observability.id

  dynamic "enabled_log" {
    for_each = ["kube-apiserver", "kube-controller-manager", "kube-scheduler", "cluster-autoscaler"]
    content {
      category = enabled_log.value
    }
  }

  metric {
    category = "AllMetrics"
  }
}

output "resource_group_name" {
  value = azurerm_resource_group.core.name
}

output "aks_cluster_id" {
  value = azurerm_kubernetes_cluster.main.id
}

output "aks_cluster_fqdn" {
  value = azurerm_kubernetes_cluster.main.fqdn
}

output "postgres_server_name" {
  value = azurerm_postgresql_flexible_server.main.name
}

output "redis_hostname" {
  value = azurerm_redis_cache.main.hostname
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "log_analytics_id" {
  value = azurerm_log_analytics_workspace.observability.id
}

output "storage_account_id" {
  value = azurerm_storage_account.shared.id
}

