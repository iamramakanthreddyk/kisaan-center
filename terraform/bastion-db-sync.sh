#!/bin/bash

#############################################################################
# Bastion DB Sync Script
# Purpose: Connect to Azure bastion, dump PostgreSQL database, and restore locally
# Requirements: WSL, Azure CLI, Docker, sshpass (optional)
# Usage: ./bastion-db-sync.sh
#############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASTION_USER="ramakanth"
BASTION_IP="4.245.187.64"
RESOURCE_GROUP="kisaancenter-rg"
VM_NAME="bastion-host"
DB_HOST="kisaancenter-db-zppisc.postgres.database.azure.com"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="kisaan_dev"
LOCAL_CONTAINER_NAME="kisaan_local_dev"
LOCAL_DB_PORT="5433"
BACKUP_FILE="kisaan_dev_backup_$(date +%Y%m%d_%H%M%S).dump"

#############################################################################
# Helper Functions
#############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    else
        print_success "$1 is installed"
        return 0
    fi
}

#############################################################################
# Step 0: Check Prerequisites
#############################################################################

print_header "Step 0: Checking Prerequisites"

ALL_PREREQUISITES_MET=true

# Check if running on WSL
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    print_warning "Not running on WSL. This script is designed for WSL."
fi

# Check Azure CLI
if ! check_command "az"; then
    print_error "Azure CLI is required. Install it with:"
    echo "curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    ALL_PREREQUISITES_MET=false
fi

# Check Docker
if ! check_command "docker"; then
    print_error "Docker is required. Install Docker Desktop for Windows and enable WSL2 integration"
    ALL_PREREQUISITES_MET=false
fi

# Check SSH
if ! check_command "ssh"; then
    print_error "SSH is required. Install with: sudo apt-get install openssh-client"
    ALL_PREREQUISITES_MET=false
fi

# Check sshpass (optional but recommended)
if ! check_command "sshpass"; then
    print_warning "sshpass is not installed. You'll need to enter password multiple times."
    print_info "To install: sudo apt-get install sshpass"
    USE_SSHPASS=false
else
    USE_SSHPASS=true
fi

if [ "$ALL_PREREQUISITES_MET" = false ]; then
    print_error "Please install missing prerequisites and try again."
    exit 1
fi

print_success "All prerequisites met!"

#############################################################################
# Step 1: Check if Bastion Host is Running
#############################################################################

print_header "Step 1: Checking Bastion Host Status"

print_info "Checking Azure login status..."
if ! az account show &> /dev/null; then
    print_warning "Not logged in to Azure. Logging in..."
    az login
fi

print_info "Checking bastion host status..."
VM_STATUS=$(az vm get-instance-view \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --query "instanceView.statuses[?starts_with(code, 'PowerState/')].displayStatus" \
    -o tsv 2>/dev/null || echo "Error")

if [ "$VM_STATUS" = "Error" ]; then
    print_error "Failed to get VM status. Check if you have access to the resource group."
    exit 1
fi

if [[ "$VM_STATUS" == *"running"* ]]; then
    print_success "Bastion host is running"
elif [[ "$VM_STATUS" == *"stopped"* ]] || [[ "$VM_STATUS" == *"deallocated"* ]]; then
    print_warning "Bastion host is stopped/deallocated"
    read -p "Do you want to start it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting bastion host... (this may take 1-2 minutes)"
        az vm start --resource-group "$RESOURCE_GROUP" --name "$VM_NAME"
        print_success "Bastion host started"
        print_info "Waiting 30 seconds for SSH to be ready..."
        sleep 30
    else
        print_error "Cannot proceed without bastion host running"
        exit 1
    fi
else
    print_warning "Unknown VM status: $VM_STATUS"
    read -p "Do you want to continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

#############################################################################
# Step 2: Get Bastion Password
#############################################################################

print_header "Step 2: Getting Bastion Password"

print_info "Enter bastion password for user '$BASTION_USER':"
read -s BASTION_PASSWORD
echo

if [ -z "$BASTION_PASSWORD" ]; then
    print_error "Password cannot be empty"
    exit 1
fi

# Test SSH connection
print_info "Testing SSH connection to bastion..."
if [ "$USE_SSHPASS" = true ]; then
    if sshpass -p "$BASTION_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$BASTION_USER@$BASTION_IP" "echo 'Connection successful'" &> /dev/null; then
        print_success "SSH connection successful"
    else
        print_error "SSH connection failed. Check password and try again."
        exit 1
    fi
else
    print_info "Please test SSH connection manually:"
    echo "ssh $BASTION_USER@$BASTION_IP"
    read -p "Press Enter after verifying you can connect..."
fi

#############################################################################
# Step 3: Get Database Password
#############################################################################

print_header "Step 3: Getting Database Password"

print_info "Enter PostgreSQL database password for user '$DB_USER':"
read -s DB_PASSWORD
echo

if [ -z "$DB_PASSWORD" ]; then
    print_error "Database password cannot be empty"
    exit 1
fi

#############################################################################
# Step 4: Take Database Dump on Bastion Host
#############################################################################

print_header "Step 4: Taking Database Dump on Bastion Host"

print_info "Creating dump of database '$DB_NAME' on bastion host..."

# Create a temporary script on bastion to run pg_dump
REMOTE_SCRIPT=$(cat <<'SCRIPT'
#!/bin/bash
export PGPASSWORD="__DB_PASSWORD__"
pg_dump -h __DB_HOST__ -p __DB_PORT__ -U __DB_USER__ -d __DB_NAME__ -F c -f ~/__BACKUP_FILE__
exit_code=$?
if [ $exit_code -eq 0 ]; then
    echo "DUMP_SUCCESS"
    ls -lh ~/__BACKUP_FILE__
else
    echo "DUMP_FAILED"
    exit $exit_code
fi
SCRIPT
)

# Replace placeholders
REMOTE_SCRIPT="${REMOTE_SCRIPT//__DB_PASSWORD__/$DB_PASSWORD}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__DB_HOST__/$DB_HOST}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__DB_PORT__/$DB_PORT}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__DB_USER__/$DB_USER}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__DB_NAME__/$DB_NAME}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//__BACKUP_FILE__/$BACKUP_FILE}"

# Execute remote script
if [ "$USE_SSHPASS" = true ]; then
    DUMP_OUTPUT=$(sshpass -p "$BASTION_PASSWORD" ssh -o StrictHostKeyChecking=no "$BASTION_USER@$BASTION_IP" "$REMOTE_SCRIPT" 2>&1)
else
    print_info "Please enter bastion password when prompted..."
    DUMP_OUTPUT=$(ssh "$BASTION_USER@$BASTION_IP" "$REMOTE_SCRIPT" 2>&1)
fi

if echo "$DUMP_OUTPUT" | grep -q "DUMP_SUCCESS"; then
    print_success "Database dump created successfully on bastion host"
    echo "$DUMP_OUTPUT" | tail -1
else
    print_error "Failed to create database dump"
    echo "$DUMP_OUTPUT"
    exit 1
fi

#############################################################################
# Step 5: Copy Dump to Local Machine
#############################################################################

print_header "Step 5: Copying Dump to Local Machine"

LOCAL_BACKUP_DIR="$HOME/kisaan_backups"
mkdir -p "$LOCAL_BACKUP_DIR"

print_info "Copying dump file to $LOCAL_BACKUP_DIR/$BACKUP_FILE..."

if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$BASTION_PASSWORD" scp -o StrictHostKeyChecking=no "$BASTION_USER@$BASTION_IP:~/$BACKUP_FILE" "$LOCAL_BACKUP_DIR/$BACKUP_FILE"
else
    print_info "Please enter bastion password when prompted..."
    scp "$BASTION_USER@$BASTION_IP:~/$BACKUP_FILE" "$LOCAL_BACKUP_DIR/$BACKUP_FILE"
fi

if [ -f "$LOCAL_BACKUP_DIR/$BACKUP_FILE" ]; then
    print_success "Dump file copied successfully"
    ls -lh "$LOCAL_BACKUP_DIR/$BACKUP_FILE"
else
    print_error "Failed to copy dump file"
    exit 1
fi

# Clean up remote dump file
print_info "Cleaning up remote dump file..."
if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$BASTION_PASSWORD" ssh -o StrictHostKeyChecking=no "$BASTION_USER@$BASTION_IP" "rm -f ~/$BACKUP_FILE"
else
    ssh "$BASTION_USER@$BASTION_IP" "rm -f ~/$BACKUP_FILE"
fi

#############################################################################
# Step 6: Start Local PostgreSQL Container
#############################################################################

print_header "Step 6: Starting Local PostgreSQL Container"

# Stop and remove existing container if exists
if docker ps -a --format '{{.Names}}' | grep -q "^${LOCAL_CONTAINER_NAME}$"; then
    print_info "Removing existing container..."
    docker rm -f "$LOCAL_CONTAINER_NAME" > /dev/null 2>&1
fi

print_info "Starting fresh PostgreSQL container..."
docker run -d \
    --name "$LOCAL_CONTAINER_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$LOCAL_DB_PORT:5432" \
    postgres:15-alpine

print_info "Waiting for PostgreSQL to be ready..."
sleep 10

# Wait for PostgreSQL to be ready
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec "$LOCAL_CONTAINER_NAME" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
        print_success "PostgreSQL container is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL container failed to start in time"
    exit 1
fi

#############################################################################
# Step 7: Restore Database from Dump
#############################################################################

print_header "Step 7: Restoring Database from Dump"

print_info "Copying dump file into container..."
docker cp "$LOCAL_BACKUP_DIR/$BACKUP_FILE" "$LOCAL_CONTAINER_NAME:/tmp/$BACKUP_FILE"

print_info "Restoring database from dump..."

# Run pg_restore and capture output, but don't fail on warnings
docker exec -e PGPASSWORD="$DB_PASSWORD" "$LOCAL_CONTAINER_NAME" \
    pg_restore -U "$DB_USER" -d "$DB_NAME" -v "/tmp/$BACKUP_FILE" 2>&1 | tee /tmp/restore_output.log || true

# Check if there were critical errors (not just warnings)
if grep -qi "fatal" /tmp/restore_output.log || grep -qi "connection.*failed" /tmp/restore_output.log; then
    print_error "Critical errors occurred during restore"
    cat /tmp/restore_output.log
    exit 1
elif grep -qi "error" /tmp/restore_output.log; then
    print_warning "Some non-critical errors/warnings occurred during restore (this is often normal)"
    echo ""
fi

print_success "Database restored successfully"

# Clean up dump file from container
docker exec "$LOCAL_CONTAINER_NAME" rm -f "/tmp/$BACKUP_FILE" > /dev/null 2>&1
rm -f /tmp/restore_output.log

#############################################################################
# Step 8: Display Connection Information
#############################################################################

print_header "Step 8: Local Database Connection Information"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}          LOCAL POSTGRESQL CONNECTION INFO${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Container Name:${NC}  $LOCAL_CONTAINER_NAME"
echo -e "${BLUE}Host:${NC}            localhost (or 127.0.0.1)"
echo -e "${BLUE}Port:${NC}            $LOCAL_DB_PORT"
echo -e "${BLUE}Database:${NC}        $DB_NAME"
echo -e "${BLUE}Username:${NC}        $DB_USER"
echo -e "${BLUE}Password:${NC}        $DB_PASSWORD"
echo ""
echo -e "${YELLOW}Connection String (for code):${NC}"
echo "postgresql://$DB_USER:$DB_PASSWORD@localhost:$LOCAL_DB_PORT/$DB_NAME"
echo ""
echo -e "${YELLOW}psql Command:${NC}"
echo "psql -h localhost -p $LOCAL_DB_PORT -U $DB_USER -d $DB_NAME"
echo ""
echo -e "${YELLOW}Docker Command (to access psql):${NC}"
echo "docker exec -it $LOCAL_CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Backup File Location:${NC}"
echo "$LOCAL_BACKUP_DIR/$BACKUP_FILE"
echo ""
echo -e "${BLUE}Container Management Commands:${NC}"
echo "  Stop:    docker stop $LOCAL_CONTAINER_NAME"
echo "  Start:   docker start $LOCAL_CONTAINER_NAME"
echo "  Remove:  docker rm -f $LOCAL_CONTAINER_NAME"
echo "  Logs:    docker logs $LOCAL_CONTAINER_NAME"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_success "Database sync completed successfully!"

# Verify database
print_info "Verifying database contents..."
TABLE_COUNT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$LOCAL_CONTAINER_NAME" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "Database contains $TABLE_COUNT tables"
else
    print_warning "Could not verify table count"
fi

print_info "\nYou can now use this local database for development!"
print_info "Remember to stop the bastion host to save costs:"
echo "  az vm deallocate --resource-group $RESOURCE_GROUP --name $VM_NAME"
