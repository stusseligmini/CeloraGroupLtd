variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "regions" {
  type = map(object({
    location = string
  }))
}

variable "tags" {
  type = map(string)
}

variable "custom_domain_hostnames" {
  type = list(string)
}

variable "enable_waf" {
  type = bool
}

variable "origin_endpoints" {
  type = map(object({
    host = string
    http_port = optional(number, 80)
    https_port = optional(number, 443)
  }))
}

