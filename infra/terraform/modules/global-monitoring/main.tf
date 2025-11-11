locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "azurerm_resource_group" "monitoring" {
  name     = "rg-${local.name_prefix}-monitoring"
  location = "westeurope"
  tags     = var.tags
}

resource "azurerm_application_insights" "global" {
  name                = "appi-${local.name_prefix}"
  location            = "westeurope"
  resource_group_name = azurerm_resource_group.monitoring.name
  application_type    = "web"
  workspace_id        = values(var.log_analytics_ids)[0]
  ingestion_enabled   = true
  retention_in_days   = 30
  sampling_percentage = 10
  tags                = var.tags
}

resource "azurerm_monitor_action_group" "oncall" {
  name                = "ag-${local.name_prefix}-platform"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "CELORA"

  dynamic "email_receiver" {
    for_each = lookup(var.tags, "alert_email", null) != null ? [1] : []
    content {
      name                    = "primary-email"
      email_address           = var.tags["alert_email"]
      use_common_alert_schema = true
    }
  }

  tags = var.tags
}

output "application_insights_connection_string" {
  value = azurerm_application_insights.global.connection_string
}

output "action_group_id" {
  value = azurerm_monitor_action_group.oncall.id
}

