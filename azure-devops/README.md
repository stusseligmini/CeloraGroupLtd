# Azure DevOps Pipelines

This directory contains the YAML definitions for Celora's Azure DevOps workflows.

## Pipelines

- `pipelines/app-ci-cd.yml` – Builds the mobile PWA, zips the browser extension, and publishes both as build artifacts.
- `pipelines/infra-terraform.yml` – Plans/applies the Terraform configuration in `infra/terraform`.

## Prerequisites

1. Azure DevOps project created (Terraform `main.tf` bootstraps a project named `<PROJECT>-<ENV>`).
2. Variable group `celora-shared` containing the Terraform state storage settings (`INFRA_STATE_RG`, `INFRA_STATE_STORAGE`, `INFRA_STATE_CONTAINER`, `INFRA_STATE_KEY`).
3. Service connection named `Azure-<environment>` with access to the subscription that hosts shared state resources.

The application pipeline no longer builds container images; deployment to App Service, Static Web Apps, or another runtime is handled downstream using the published artifacts.
