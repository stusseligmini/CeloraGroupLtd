output "resource_groups" {
  description = "Resource groups per deployment region."
  value       = { for k, v in module.region_core : k => v.resource_group_name }
}

output "aks_cluster_ids" {
  description = "AKS cluster IDs per region."
  value       = { for k, v in module.region_core : k => v.aks_cluster_id }
}

output "aks_cluster_fqdns" {
  description = "AKS public API FQDN per region."
  value       = { for k, v in module.region_core : k => v.aks_cluster_fqdn }
}

output "postgres_server_names" {
  description = "Azure Database for PostgreSQL Flexible Server names."
  value       = { for k, v in module.region_core : k => v.postgres_server_name }
}

output "redis_cache_hostnames" {
  description = "Redis cache endpoints per region."
  value       = { for k, v in module.region_core : k => v.redis_hostname }
}

output "key_vault_uris" {
  description = "Key Vault URIs per region."
  value       = { for k, v in module.region_core : k => v.key_vault_uri }
}

output "front_door_endpoint" {
  description = "Global Azure Front Door endpoint."
  value       = module.global_frontdoor.endpoint
}

