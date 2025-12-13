# Bootstrap Terraform State Management for KisaanCenter

This folder contains Terraform configuration to set up Azure Storage Account for remote state management.

## What this creates:

1. **Resource Group**: `terraform-state-rg` - Dedicated resource group for state management
2. **Storage Account**: `tfstate{random-suffix}` - Azure Storage Account (equivalent to AWS S3)
3. **Storage Container**: `tfstate` - Container within the storage account for state files
4. **Versioning**: Enabled on the storage account for state file protection
5. **Retention Policy**: 30-day retention for deleted blobs

## How to use:

### Step 1: Run Bootstrap (One-time setup)
```bash
cd terraform/bootstrap
terraform init
terraform plan
terraform apply
```

### Step 2: Note the outputs
After `terraform apply`, copy the backend configuration from the output.

### Step 3: Update your main Terraform configuration
Add the backend configuration to your main `terraform/main.tf` file:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
  
  # Add this backend configuration
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate{your-suffix}"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
```

### Step 4: Migrate existing state (if any)
```bash
cd ../  # Back to main terraform directory
terraform init  # This will prompt to migrate state
```

## Cost Information:
- **Storage Account (LRS)**: ~€0.018 per GB per month
- **State file size**: Usually < 1MB for small projects
- **Monthly cost**: < €0.10

## Security Features:
- Private container access
- Versioning enabled for state file protection
- 30-day retention policy for accidental deletions
- Access keys managed by Azure

## Important Notes:
- Run this bootstrap **once** before setting up your main infrastructure
- Keep the bootstrap state file local (it's small and rarely changes)
- The main infrastructure state will be stored remotely
- Never delete the storage account without backing up your state files