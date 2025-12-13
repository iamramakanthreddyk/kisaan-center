# Configure the Azure Provider for Bootstrap
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~>3.1"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
}

# Generate a random string for unique storage account name
resource "random_string" "storage_account_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Create a resource group for terraform state management
resource "azurerm_resource_group" "terraform_state_rg" {
  name     = "terraform-state-rg"
  location = "Germany West Central"

  tags = {
    Environment = "Infrastructure"
    Purpose     = "Terraform State Management"
    Project     = "KisaanCenter"
    CreatedBy   = "Terraform Bootstrap"
  }
}

# Create a storage account for terraform state
resource "azurerm_storage_account" "terraform_state" {
  name                     = "tfstate${random_string.storage_account_suffix.result}"
  resource_group_name      = azurerm_resource_group.terraform_state_rg.name
  location                 = azurerm_resource_group.terraform_state_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"  # Locally Redundant Storage (cheapest option)
  
  # Enable versioning for state file protection
  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 30
    }
  }

  tags = {
    Environment = "Infrastructure"
    Purpose     = "Terraform State Storage"
    Project     = "KisaanCenter"
    CreatedBy   = "Terraform Bootstrap"
  }
}

# Create a container (equivalent to S3 bucket) for terraform state files
resource "azurerm_storage_container" "terraform_state_container" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.terraform_state.name
  container_access_type = "private"
}

# Output important information for configuring remote state
output "storage_account_name" {
  value = azurerm_storage_account.terraform_state.name
  description = "Name of the storage account for Terraform state"
}

output "container_name" {
  value = azurerm_storage_container.terraform_state_container.name
  description = "Name of the storage container for Terraform state"
}

output "resource_group_name" {
  value = azurerm_resource_group.terraform_state_rg.name
  description = "Name of the resource group containing the storage account"
}

output "storage_account_primary_access_key" {
  value = azurerm_storage_account.terraform_state.primary_access_key
  description = "Primary access key for the storage account"
  sensitive = true
}

output "backend_config" {
  value = <<-EOT
    # Add this to your main Terraform configuration:
    terraform {
      backend "azurerm" {
        resource_group_name  = "${azurerm_resource_group.terraform_state_rg.name}"
        storage_account_name = "${azurerm_storage_account.terraform_state.name}"
        container_name       = "${azurerm_storage_container.terraform_state_container.name}"
        key                  = "terraform.tfstate"
      }
    }
  EOT
  description = "Backend configuration to add to your main Terraform files"
}