locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "azurerm_cdn_frontdoor_profile" "global" {
  name                = "fd-${local.name_prefix}"
  resource_group_name = coalesce(var.tags["resource_group_frontdoor"], "rg-${local.name_prefix}-global")
  sku_name            = "Standard_AzureFrontDoor"
  tags                = var.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "global" {
  name                     = "ep-${local.name_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.global.id
  enabled                  = true
}

resource "azurerm_cdn_frontdoor_origin_group" "app" {
  name                     = "og-${local.name_prefix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.global.id

  session_affinity_enabled = false
  health_probe {
    interval_in_seconds = 30
    protocol            = "Https"
    request_type        = "GET"
    path                = "/health/edge"
  }

  load_balancing {
    additional_latency_in_milliseconds = 0
    sample_size                       = 4
    successful_samples_required       = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "region" {
  for_each = var.origin_endpoints

  name                           = "origin-${each.key}"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.app.id
  host_name                      = each.value.host
  http_port                      = each.value.http_port
  https_port                     = each.value.https_port
  origin_host_header             = each.value.host
  priority                       = each.key == "primary" ? 1 : 2
  weight                         = each.key == "primary" ? 100 : 50
  enabled                        = true
}

resource "azurerm_cdn_frontdoor_route" "app" {
  name                          = "route-${local.name_prefix}"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.global.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.app.id
  cdn_frontdoor_origin_ids      = [for o in azurerm_cdn_frontdoor_origin.region : o.id]
  enabled                       = true
  https_redirect_enabled        = true
  supported_protocols           = ["Http", "Https"]
  patterns_to_match             = ["/*"]
  forwarding_protocol           = "MatchRequest"
  link_to_default_domain        = true
}

resource "azurerm_cdn_frontdoor_custom_domain" "custom" {
  for_each = toset(var.custom_domain_hostnames)

  name                     = "cust-${replace(each.value, ".", "-")}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.global.id
  host_name                = each.value
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "custom" {
  for_each = azurerm_cdn_frontdoor_custom_domain.custom

  cdn_frontdoor_custom_domain_id = each.value.id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.app.id]
}

resource "azurerm_cdn_frontdoor_firewall_policy" "waf" {
  count       = var.enable_waf ? 1 : 0
  name        = "waf-${local.name_prefix}"
  mode        = "Prevention"
  sku_name    = "Premium_AzureFrontDoor"
  tags        = var.tags

  managed_rule {
    type    = "DefaultRuleSet"
    version = "2.1"
  }
}

output "endpoint" {
  value = "https://${azurerm_cdn_frontdoor_endpoint.global.host_name}"
}

