variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "log_analytics_ids" {
  description = "Map of log analytics workspace IDs keyed by region."
  type        = map(string)
}

