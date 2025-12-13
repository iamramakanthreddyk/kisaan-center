#!/bin/bash

# Azure Authentication Validator Script
# This script helps you validate and update Azure authentication secrets for GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OWNER="manojRY"
GITHUB_REPO="kisaanCenter"

echo -e "${BLUE}🔐 Azure Authentication Secrets Validator${NC}"
echo "=============================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first:${NC}"
    echo "   brew install gh"
    echo "   or visit: https://cli.github.com/"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI (az) is not installed. Please install it first:${NC}"
    echo "   brew install azure-cli"
    echo "   or visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  You are not logged in to GitHub CLI. Logging in...${NC}"
    gh auth login
fi

echo -e "${BLUE}📋 Checking current Azure authentication...${NC}"

# Get current Azure account info
if az account show &> /dev/null; then
    CURRENT_SUBSCRIPTION=$(az account show --query id -o tsv)
    CURRENT_TENANT=$(az account show --query tenantId -o tsv)
    
    echo -e "${GREEN}✅ Currently logged in to Azure:${NC}"
    echo "   Subscription ID: $CURRENT_SUBSCRIPTION"
    echo "   Tenant ID: $CURRENT_TENANT"
    
    # Function to update GitHub secret
    update_github_secret() {
        local secret_name="$1"
        local secret_value="$2"
        
        if [ -z "$secret_value" ]; then
            echo -e "${YELLOW}⚠️  Skipping $secret_name (empty value)${NC}"
            return
        fi
        
        echo -e "${BLUE}🔄 Updating secret: $secret_name${NC}"
        if echo "$secret_value" | gh secret set "$secret_name" --repo="$GITHUB_OWNER/$GITHUB_REPO"; then
            echo -e "${GREEN}✅ Updated: $secret_name${NC}"
        else
            echo -e "${RED}❌ Failed to update: $secret_name${NC}"
        fi
    }
    
    echo ""
    echo -e "${BLUE}🔄 Updating Azure authentication secrets...${NC}"
    
    # Update the secrets we can determine automatically
    update_github_secret "AZURE_SUBSCRIPTION_ID" "$CURRENT_SUBSCRIPTION"
    update_github_secret "AZURE_TENANT_ID" "$CURRENT_TENANT"
    
    echo ""
    echo -e "${YELLOW}⚠️  Manual secrets that need to be set:${NC}"
    echo ""
    echo -e "${BLUE}AZURE_CLIENT_ID:${NC}"
    echo "This is your service principal's Application (client) ID."
    echo "You can find this in Azure Portal > App registrations > Your app > Overview"
    echo ""
    echo -e "${BLUE}AZURE_CLIENT_SECRET:${NC}"
    echo "This is your service principal's client secret value."
    echo "You can create this in Azure Portal > App registrations > Your app > Certificates & secrets"
    echo ""
    
    # Check if these secrets exist
    echo -e "${BLUE}📋 Checking existing secrets in GitHub repository...${NC}"
    
    # Get list of current secrets
    EXISTING_SECRETS=$(gh secret list --repo="$GITHUB_OWNER/$GITHUB_REPO" --json name --jq '.[].name')
    
    check_secret_exists() {
        local secret_name="$1"
        if echo "$EXISTING_SECRETS" | grep -q "^$secret_name$"; then
            echo -e "${GREEN}✅ $secret_name exists${NC}"
        else
            echo -e "${RED}❌ $secret_name missing${NC}"
        fi
    }
    
    echo ""
    echo "Azure Authentication Secrets Status:"
    check_secret_exists "AZURE_CLIENT_ID"
    check_secret_exists "AZURE_CLIENT_SECRET"
    check_secret_exists "AZURE_SUBSCRIPTION_ID"
    check_secret_exists "AZURE_TENANT_ID"
    
    echo ""
    echo "Container Registry Secrets Status:"
    check_secret_exists "AZURE_CONTAINER_REGISTRY"
    check_secret_exists "AZURE_REGISTRY_LOGIN_SERVER"
    check_secret_exists "AZURE_REGISTRY_USERNAME" 
    check_secret_exists "AZURE_REGISTRY_PASSWORD"
    
else
    echo -e "${RED}❌ Not logged in to Azure CLI. Please run 'az login' first.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🛠️  To create a service principal for GitHub Actions:${NC}"
echo ""
echo "1. Create a service principal:"
echo "   az ad sp create-for-rbac --name \"github-actions-kisaancenter\" --role contributor --scopes /subscriptions/$CURRENT_SUBSCRIPTION/resourceGroups/kisaancenter-rg"
echo ""
echo "2. The output will give you:"
echo "   - appId (use as AZURE_CLIENT_ID)"
echo "   - password (use as AZURE_CLIENT_SECRET)"
echo "   - tenant (use as AZURE_TENANT_ID)"
echo ""
echo "3. Then manually update these secrets in GitHub:"
echo "   gh secret set AZURE_CLIENT_ID --repo=$GITHUB_OWNER/$GITHUB_REPO"
echo "   gh secret set AZURE_CLIENT_SECRET --repo=$GITHUB_OWNER/$GITHUB_REPO"
echo ""

echo -e "${GREEN}🎉 Azure authentication validation completed!${NC}"
echo ""
echo -e "${BLUE}📋 All repository secrets:${NC}"
gh secret list --repo="$GITHUB_OWNER/$GITHUB_REPO"