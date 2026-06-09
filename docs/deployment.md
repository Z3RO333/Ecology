# Azure App Service Deployment

## Prerequisites

- Azure CLI installed: `az login`
- Resource group already created or use an existing one

> **Status (provisioned 2026-06-09):** The resources below were already created
> in resource group `RGDIROPERACIONAL` (the only RG the deploy account has
> write access to). App URL: `https://ecotracker-app.azurewebsites.net`.

## 1. Create App Service Plan + Web App

```bash
# Variables — adjust as needed
RG="RGDIROPERACIONAL"   # existing RG; the deploy account is Owner here
PLAN="plan-ecotracker"
APP="ecotracker-app"
LOCATION="brazilsouth"

# NOTE: creating a new resource group requires subscription-level write access.
# If you have it, run: az group create --name $RG --location $LOCATION
# Otherwise deploy into an existing RG you own (as done here).

# Create App Service Plan (B1, Linux)
az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --sku B1 \
  --is-linux \
  --location $LOCATION

# Create Web App with Node 22 LTS (Node 20 is no longer offered on App Service)
az webapp create \
  --name $APP \
  --resource-group $RG \
  --plan $PLAN \
  --runtime "NODE:22-lts"

# Enable Oryx build on deploy + pin Node major
az webapp config appsettings set \
  --name $APP \
  --resource-group $RG \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITE_NODE_DEFAULT_VERSION=~22
```

## 2. Configure Environment Variables

```bash
az webapp config appsettings set \
  --name $APP \
  --resource-group $RG \
  --settings \
    AUTH_SECRET="<generate with: openssl rand -base64 32>" \
    AUTH_MICROSOFT_ENTRA_ID_ID="<client_id from Azure AD app>" \
    AUTH_MICROSOFT_ENTRA_ID_SECRET="<client_secret>" \
    AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<tenant_id>/v2.0" \
    DATABRICKS_SERVER_HOSTNAME="<workspace>.azuredatabricks.net" \
    DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/<warehouse_id>" \
    DATABRICKS_TOKEN="<personal_access_token>" \
    DATABRICKS_CATALOG="<catalog_name>" \
    DATABRICKS_SCHEMA="<schema_name>" \
    NEXTAUTH_URL="https://$APP.azurewebsites.net" \
    NODE_ENV="production"
```

## 3. Configure Startup Command

```bash
az webapp config set \
  --name $APP \
  --resource-group $RG \
  --startup-file "startup.sh"
```

## 4. Deploy via GitHub Actions (CI/CD)

```bash
# Get publish profile
az webapp deployment list-publishing-profiles \
  --name $APP \
  --resource-group $RG \
  --xml > publish-profile.xml
```

Add `AZURE_WEBAPP_PUBLISH_PROFILE` as a GitHub secret, then create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - uses: azure/webapps-deploy@v3
        with:
          app-name: 'ecotracker-app'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```

## 5. Update Microsoft Entra ID Redirect URI

In the Azure Portal → your App Registration → Authentication:

Add redirect URI:
```
https://ecotracker-app.azurewebsites.net/api/auth/callback/microsoft-entra-id
```

## 6. Create Databricks Table (run once)

Connect to your Databricks workspace and run:

```sql
CREATE TABLE IF NOT EXISTS recycling_records (
  id STRING,
  material_type STRING,
  weight_kg DECIMAL(10,3),
  sector STRING,
  responsible_name STRING,
  notes STRING,
  recorded_at TIMESTAMP,
  recorded_date DATE
)
USING DELTA;
```

## 7. Verify Deployment

```bash
# Check app status
az webapp show --name $APP --resource-group $RG --query state

# Stream logs
az webapp log tail --name $APP --resource-group $RG
```

Open: `https://ecotracker-app.azurewebsites.net/tablet` (public)
Open: `https://ecotracker-app.azurewebsites.net/dashboard` (requires Microsoft SSO)
