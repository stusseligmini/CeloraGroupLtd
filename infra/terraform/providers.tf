terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.48"
    }
    azuredevops = {
      source  = "microsoft/azuredevops"
      version = "~> 1.1"
    }
  }

  backend "azurerm" {
    resource_group_name  = var.state_resource_group
    storage_account_name = var.state_storage_account
    container_name       = var.state_container_name
    key                  = var.state_key
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    key_vault {
      recover_soft_deleted_key_vaults = true
    }
  }
}

provider "azuread" {
  tenant_id = var.azuread_tenant_id
}

provider "azuredevops" {
  org_service_url       = var.azure_devops_organization_url
  personal_access_token = var.azure_devops_pat
}

