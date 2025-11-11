# Celora Azure Terraform Stack

This directory hosts the Terraform configuration for Celora's multi-region Azure landing zone (primary in Norway East, secondary in West Europe).

## Layout

- `providers.tf` – shared provider configuration and remote-state backend.
- `variables.tf` – all input variables (regions, sizing, credentials, tags).
- `main.tf` – orchestrates regional deployments, Azure Front Door, Azure Monitor, Azure AD B2C bootstrap and Azure DevOps setup.
- `modules/region-core` – per-region resources: resource group, VNet/subnets, AKS, PostgreSQL Flexible Server, Redis, Key Vault, Log Analytics, storage.
- `modules/global-frontdoor` – Azure Front Door Standard/Premium profile balancing traffic across regions.
- `modules/global-monitoring` – centralised Application Insights + alert action group.

> Remote state is stored in Azure Storage. Supply the backend variables (`state_*`) via `terraform.tfvars` or CLI arguments.

## Example `terraform.tfvars`

```hcl
project_name = "celora"
environment  = "prod"

regions = {
  primary = {
    location          = "norwayeast"
    geo_pair_location = "westeurope"
  }
  secondary = {
    location          = "westeurope"
    geo_pair_location = "northeurope"
  }
}

aad_b2c = {
  tenant_name         = "celora-b2c"
  display_name        = "Celora Identity"
  domain_name         = "celora.onmicrosoft.com"
  app_spa_reply_urls  = ["https://app.celora.com/auth/callback"]
  api_app_identifier  = "api://celora-platform"
}

aks = {
  kubernetes_version = "1.29.2"
  system_node_pool = {
    vm_size   = "Standard_D4as_v5"
    node_count = 3
    min_count  = 3
    max_count  = 6
  }
  user_node_pool = {
    vm_size   = "Standard_D8as_v5"
    node_count = 4
    min_count  = 2
    max_count  = 8
  }
  network = {
    vnet_cidr        = "10.50.0.0/16"
    aks_subnet_cidr  = "10.50.1.0/24"
    app_subnet_cidr  = "10.50.2.0/24"
    private_dns_zone = "privatelink.postgres.database.azure.com"
  }
}

postgres = {
  sku_name               = "GP_Standard_D4s_v5"
  storage_mb             = 512000
  backup_retention_days  = 14
  administrator_login    = "celora_admin"
  administrator_password = "CHANGE-ME"
  version                = "16"
}

redis = {
  sku_name   = "Premium"
  family     = "P"
  capacity   = 2
  enable_tls = true
}

storage = {
  account_tier             = "Standard"
  account_replication_type = "ZRS"
  enable_static_website    = false
}

front_door = {
  custom_domain_hostnames = ["app.celora.com"]
  enable_waf              = true
}

tags = {
  Owner       = "platform-team"
  CostCenter  = "celora-platform"
  alert_email = "oncall@celora.com"
}

azure_devops_organization_url = "https://dev.azure.com/celora"
azure_devops_pat              = "AZDO_PAT"
azure_devops_spn_app_id       = "00000000-0000-0000-0000-000000000000"
azure_devops_spn_secret       = "SPN_SECRET"
azure_subscription_id         = "00000000-0000-0000-0000-000000000000"
azure_subscription_name       = "celora-production"

state_resource_group   = "rg-terraform-state"
state_storage_account  = "stterraformstate"
state_container_name   = "tfstate"
state_key              = "celora-prod.tfstate"
azuread_tenant_id      = "00000000-0000-0000-0000-000000000000"
```

## Usage

```bash
az login
cd infra/terraform
terraform init -backend-config="use_azuread_auth=true"
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```
