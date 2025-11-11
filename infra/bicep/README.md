# Celora Azure Bicep Templates

Alternative to Terraform for teams preferring native ARM tooling. The structure mirrors the Terraform stack:

- `main.bicep` orchestrates regional modules, Azure Front Door and monitoring.
- `modules/regionCore.bicep` provisions per-region resources (resource group, VNet, AKS, PostgreSQL, Redis, Key Vault, Storage, Log Analytics).
- `modules/frontDoor.bicep` configures Azure Front Door.
- `modules/monitoring.bicep` creates a shared Application Insights instance.

## Deploy

```bash
az login
az account set --subscription <subscription_id>
az deployment sub create \
  --name celora-prod \
  --location westeurope \
  --template-file infra/bicep/main.bicep \
  --parameters projectName=celora environment=prod \
               primaryLocation=norwayeast secondaryLocation=westeurope \
               aadB2cTenantName=celora-b2c aadB2cDomainName=celora.onmicrosoft.com
```

Supply the configuration objects (`aksConfig`, `postgresSettings`, etc.) via `--parameters @prod.json` for readability.
