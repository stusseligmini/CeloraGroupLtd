/**
 * Azure Monitor Alert Rules
 * 
 * Defines alert rules for critical application metrics:
 * - API error rate
 * - API latency (P95)
 * - Database connection failures
 * - Application Insights availability
 */

locals {
  app_insights_name = azurerm_application_insights.global.name
  action_group_id   = azurerm_monitor_action_group.oncall.id
}

# Alert: High API Error Rate
resource "azurerm_monitor_metric_alert" "api_error_rate" {
  name                = "alert-${local.name_prefix}-api-error-rate"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.global.id]
  description         = "Alert when API error rate exceeds 5%"
  severity            = 2 # Warning
  enabled             = true
  auto_mitigate        = true
  frequency           = "PT5M" # Every 5 minutes
  window_size         = "PT5M" # 5 minute window

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 10 # More than 10 failed requests in 5 minutes

    dimension {
      name     = "request/resultCode"
      operator = "Include"
      values   = ["5xx"]
    }
  }

  action {
    action_group_id = local.action_group_id
  }

  tags = var.tags
}

# Alert: High API Latency (P95)
resource "azurerm_monitor_metric_alert" "api_latency_p95" {
  name                = "alert-${local.name_prefix}-api-latency-p95"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.global.id]
  description         = "Alert when P95 API latency exceeds 2000ms"
  severity            = 2 # Warning
  enabled             = true
  auto_mitigate        = true
  frequency           = "PT5M"
  window_size         = "PT15M" # 15 minute window for percentile calculation

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "requests/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 2000 # 2000ms = 2 seconds
  }

  action {
    action_group_id = local.action_group_id
  }

  tags = var.tags
}

# Alert: Database Connection Failures
resource "azurerm_monitor_metric_alert" "database_connection_failures" {
  name                = "alert-${local.name_prefix}-db-connection-failures"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.global.id]
  description         = "Alert when database connection failures detected"
  severity            = 1 # Critical
  enabled             = true
  auto_mitigate        = true
  frequency           = "PT5M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "exceptions/count"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 5 # More than 5 exceptions in 5 minutes

    dimension {
      name     = "exception/type"
      operator = "Include"
      values   = ["DatabaseException", "PrismaClientKnownRequestError"]
    }
  }

  action {
    action_group_id = local.action_group_id
  }

  tags = var.tags
}

# Alert: Application Insights Availability Drop
resource "azurerm_monitor_metric_alert" "availability_drop" {
  name                = "alert-${local.name_prefix}-availability-drop"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.global.id]
  description         = "Alert when application availability drops below 95%"
  severity            = 1 # Critical
  enabled             = true
  auto_mitigate        = true
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "availabilityResults/availabilityPercentage"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 95 # Less than 95% availability
  }

  action {
    action_group_id = local.action_group_id
  }

  tags = var.tags
}

# Alert: High Exception Rate
resource "azurerm_monitor_metric_alert" "exception_rate" {
  name                = "alert-${local.name_prefix}-exception-rate"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.global.id]
  description         = "Alert when exception rate exceeds 5 exceptions per minute"
  severity            = 2 # Warning
  enabled             = true
  auto_mitigate        = true
  frequency           = "PT5M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "exceptions/count"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 25 # 5 exceptions/min * 5 minutes = 25
  }

  action {
    action_group_id = local.action_group_id
  }

  tags = var.tags
}

# Alert: Slow Database Queries
resource "azurerm_monitor_metric_alert" "slow_db_queries" {
  name                = "alert-${local.name_prefix}-slow-db-queries"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.global.id]
  description         = "Alert when database query duration exceeds 1000ms"
  severity            = 3 # Informational
  enabled             = true
  auto_mitigate        = true
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "dependencies/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 1000 # 1000ms = 1 second

    dimension {
      name     = "dependency/type"
      operator = "Include"
      values   = ["SQL"]
    }
  }

  action {
    action_group_id = local.action_group_id
  }

  tags = var.tags
}

