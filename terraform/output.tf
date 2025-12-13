# ===============================================
# OUTPUTS
# ===============================================

# Output the resource group details
output "resource_group_name" {
  value = azurerm_resource_group.kisaancenter_rg.name
}

output "resource_group_location" {
  value = azurerm_resource_group.kisaancenter_rg.location
}

# Output the Key Vault details
output "key_vault_name" {
  value = azurerm_key_vault.kisaancenter_kv.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.kisaancenter_kv.vault_uri
}

# Output the PostgreSQL server details (NO PASSWORD)
output "postgresql_server_name" {
  value = azurerm_postgresql_flexible_server.kisaancenter_db.name
}

output "postgresql_server_fqdn" {
  value = azurerm_postgresql_flexible_server.kisaancenter_db.fqdn
}

output "postgresql_database_name" {
  value = azurerm_postgresql_flexible_server_database.kisaancenter_database.name
}

output "postgresql_admin_username" {
  value = "postgres"
}

# Output Container Apps details
output "container_app_environment_name" {
  value = azurerm_container_app_environment.kisaancenter_env.name
}

output "backend_container_app_name" {
  value = azurerm_container_app.kisaancenter_backend.name
}

output "backend_container_app_fqdn" {
  value = azurerm_container_app.kisaancenter_backend.latest_revision_fqdn
  description = "FQDN for the backend API (accessible from frontend)"
}

output "backend_container_app_url" {
  value = "https://${azurerm_container_app.kisaancenter_backend.latest_revision_fqdn}"
  description = "Complete URL for the backend API"
}

# Output deployment information for GitHub Actions
output "deployment_info" {
  value = {
    backend_api = {
      name = azurerm_container_app.kisaancenter_backend.name
      fqdn = azurerm_container_app.kisaancenter_backend.latest_revision_fqdn
      url  = "https://${azurerm_container_app.kisaancenter_backend.latest_revision_fqdn}"
      environment = azurerm_container_app_environment.kisaancenter_env.name
      resource_group = azurerm_resource_group.kisaancenter_rg.name
    }
    database = {
      server_name = azurerm_postgresql_flexible_server.kisaancenter_db.name
      fqdn = azurerm_postgresql_flexible_server.kisaancenter_db.fqdn
      database_name = azurerm_postgresql_flexible_server_database.kisaancenter_database.name
      username = "postgres"
    }
    secrets = {
      key_vault_name = azurerm_key_vault.kisaancenter_kv.name
      db_password_secret = azurerm_key_vault_secret.postgresql_password.name
      app_secret_key = azurerm_key_vault_secret.app_secret_key.name
    }
  }
  description = "Complete deployment information for the FREE tier KisaanCenter application"
}

# Output cost summary
output "cost_summary" {
  value = {
    postgresql_flexible_server = "FREE for 12 months (B1ms + 32GB storage)"
    container_apps = "FREE tier (180,000 vCPU-seconds monthly)"
    log_analytics = "Pay-per-GB (~€0.10/month for small usage)"
    key_vault = "~€0.03/month"
    virtual_network = "FREE"
    dns_zone = "~€0.45/month"
    bastion_host = "~€7-10/month (Standard_B1s VM)"
    estimated_monthly_cost = "~€8-11/month"
    after_12_months = "~€23-31/month (when PostgreSQL free tier expires)"
  }
  description = "Cost breakdown for the FREE tier architecture with bastion host"
}

# ===============================================
# BASTION HOST OUTPUTS
# ===============================================

output "bastion_host_public_ip" {
  value = azurerm_public_ip.bastion_pip.ip_address
  description = "Public IP address of the bastion host (Dynamic - only allocated when VM is running)"
}

output "bastion_host_private_ip" {
  value = azurerm_network_interface.bastion_nic.private_ip_address
  description = "Private IP address of the bastion host"
}

output "bastion_ssh_private_key_secret_name" {
  value = "Use your local SSH key: ~/.ssh/id_rsa"
  description = "SSH private key location for connecting to bastion host"
}

output "bastion_user_credentials" {
  value = {
    username = var.bastion_username
    password_secret = azurerm_key_vault_secret.bastion_user_password.name
    password_command = "az keyvault secret show --vault-name kisaancenter-kv-zppisc --name bastion-user-password --query value -o tsv"
    ssh_connection = "ssh ${var.bastion_username}@${azurerm_public_ip.bastion_pip.ip_address}"
  }
  description = "Credentials for the additional bastion user with password authentication"
  sensitive = false  # Set to true if you want to hide from console output
}

output "database_connection_info" {
  value = {
    host = azurerm_postgresql_flexible_server.kisaancenter_db.fqdn
    port = "5432"
    database = azurerm_postgresql_flexible_server_database.kisaancenter_database.name
    username = "postgres"
    password_secret = azurerm_key_vault_secret.postgresql_password.name
  }
  description = "Database connection information for use from bastion host"
}

output "bastion_connection_instructions" {
  value = <<-EOT
# Bastion Host Connection Instructions

## TWO WAYS TO CONNECT:

### Option 1: SSH Key Authentication (azureuser - Admin)
ssh -i ~/.ssh/id_rsa azureuser@${azurerm_public_ip.bastion_pip.ip_address}

### Option 2: Password Authentication (${var.bastion_username} - Database Admin)
ssh ${var.bastion_username}@${azurerm_public_ip.bastion_pip.ip_address}

To get the password for ${var.bastion_username} user:
az keyvault secret show --vault-name ${azurerm_key_vault.kisaancenter_kv.name} --name bastion-user-password --query value -o tsv

## USER ACCOUNTS:

1. **azureuser** (Admin user)
   - Authentication: SSH key only
   - Sudo access: Yes
   - SSH key: ~/.ssh/id_rsa

2. **${var.bastion_username}** (Database admin user)
   - Authentication: Password
   - Sudo access: Yes
   - Password stored in Key Vault: bastion-user-password

## 1. Get the Bastion Public IP
The public IP shown above might be empty if VM was recently started.
To get the current IP:
az network public-ip show --resource-group kisaancenter-rg --name bastion-pip --query ipAddress -o tsv

## 2. Connect to Bastion Host from your laptop

# Using SSH key (azureuser):
ssh -i ~/.ssh/id_rsa azureuser@${azurerm_public_ip.bastion_pip.ip_address}

# Using password (${var.bastion_username}):
ssh ${var.bastion_username}@${azurerm_public_ip.bastion_pip.ip_address}
# (You'll be prompted for password)

## 3. Retrieve PostgreSQL Password from Key Vault (run on bastion host)
az login
az keyvault secret show --vault-name ${azurerm_key_vault.kisaancenter_kv.name} --name ${azurerm_key_vault_secret.postgresql_password.name} --query value -o tsv

## 4. Connect to PostgreSQL Database from Bastion Host
psql -h ${azurerm_postgresql_flexible_server.kisaancenter_db.fqdn} -p 5432 -U postgres -d ${azurerm_postgresql_flexible_server_database.kisaancenter_database.name}

## 5. Restore Database from Dump (copy your dump file to bastion first)

# Copy dump to bastion from your laptop (using SSH key):
scp -i ~/.ssh/id_rsa your_dump.sql azureuser@${azurerm_public_ip.bastion_pip.ip_address}:~/

# Copy dump to bastion from your laptop (using password):
scp your_dump.sql ${var.bastion_username}@${azurerm_public_ip.bastion_pip.ip_address}:~/

# Then on bastion:
psql -h ${azurerm_postgresql_flexible_server.kisaancenter_db.fqdn} -p 5432 -U postgres -d ${azurerm_postgresql_flexible_server_database.kisaancenter_database.name} < ~/your_dump.sql

## Cost Savings Tips:
1. Stop the bastion VM when not in use to save costs:
   az vm deallocate --resource-group kisaancenter-rg --name bastion-host
   
2. Start it when needed:
   az vm start --resource-group kisaancenter-rg --name bastion-host
   
3. When stopped, you don't pay for:
   - VM compute costs
   - Dynamic public IP (IP is released)
   
4. You only pay for the disk storage (~$1-2/month for Standard HDD)

## Security Recommendations:
- SSH key authentication is more secure than password (use azureuser for automated scripts)
- Password authentication enabled for dbadmin user (convenient for manual access)
- Both users have sudo access
- RECOMMENDED: Update the NSG rule to restrict to your specific IP:
  az network nsg rule update --resource-group kisaancenter-rg --nsg-name bastion-nsg --name SSH --source-address-prefixes YOUR_IP/32
- PostgreSQL is only accessible from within the VNet (via bastion host)
- Always stop the VM when not in use
  EOT
  description = "Complete instructions for connecting to the bastion host with both SSH key and password authentication"
}