variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "region_key" {
  description = "Key name for the region (primary/secondary)."
  type        = string
}

variable "location" {
  type = string
}

variable "geo_pair_location" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "aks" {
  type = any
}

variable "postgres" {
  type      = any
  sensitive = true
}

variable "redis" {
  type = any
}

variable "storage" {
  type = any
}

variable "aad_b2c_tenant_name" {
  type = string
}

