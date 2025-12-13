# 🚀 Production Database Deployment Guide

## Overview
This guide walks you through safely deploying your KisaanCenter backend to a production database.

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Production database server is running
- [ ] Database credentials are available
- [ ] Network connectivity to database is confirmed
- [ ] SSL certificates configured (if required)

### 2. Dependencies
```bash
cd kisaan-backend-node
npm install bcryptjs pg dotenv
```

### 3. Environment Configuration
Update `.env.production` with your actual production database credentials:

```env
# Production Database Configuration
DB_HOST=your-production-db-host.com
DB_PORT=5432
DB_NAME=kisaan_production
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_SSL_MODE=require  # Use 'require' for cloud databases

# Application Configuration
NODE_ENV=production
JWT_SECRET=your-very-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Application URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# Email Configuration (for notifications)
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-email-password

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB
```

## Deployment Methods

### Method 1: Interactive Deployment (Recommended)

```bash
# Navigate to backend directory
cd kisaan-backend-node

# Run interactive deployment
node deploy-production.js
```

This will:
- ✅ Test database connection
- ✅ Check for existing data
- ✅ Deploy complete schema
- ✅ Seed initial data (superadmin, plans, categories)
- ✅ Validate deployment

### Method 2: Using Schema Manager

```bash
# Navigate to backend directory
cd kisaan-backend-node

# Initialize production database
node schema/schema-manager.js init --env=production

# Verify deployment
node schema/schema-manager.js status --env=production
```

### Method 3: Manual Deployment

If you prefer manual control:

```bash
# 1. Test connection
psql -h your-host -p 5432 -U your-user -d your-database -c "SELECT NOW();"

# 2. Deploy schema
psql -h your-host -p 5432 -U your-user -d your-database -f schema/complete-schema.sql

# 3. Deploy indexes
psql -h your-host -p 5432 -U your-user -d your-database -f schema/indexes.sql
```

## Post-Deployment Steps

### 1. Verify Database Tables
```sql
-- Connect to your production database and run:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'kisaan_%';
```

Expected tables:
- kisaan_users
- kisaan_shops
- kisaan_plans
- kisaan_categories
- kisaan_products
- kisaan_transactions
- kisaan_payments
- kisaan_commissions
- kisaan_reports

### 2. Test Initial Login
```bash
# Start your backend in production mode
NODE_ENV=production npm start

# Test superadmin login
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadminpass"
  }'
```

### 3. Change Default Passwords
**CRITICAL**: Immediately change the default superadmin password:

```bash
# Login to get token, then:
curl -X PUT https://your-api-domain.com/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "superadminpass",
    "newPassword": "your-very-secure-password"
  }'
```

## Security Checklist

### Database Security
- [ ] Use strong, unique passwords
- [ ] Enable SSL/TLS encryption
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable audit logging

### Application Security
- [ ] Change default superadmin password
- [ ] Use secure JWT secret (32+ characters)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring

## Backup Strategy

### Daily Automated Backup
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-host -U your-user -d your-database > backup_$DATE.sql
gzip backup_$DATE.sql

# Keep only last 30 days
find . -name "backup_*.sql.gz" -mtime +30 -delete
```

### Backup Schedule
```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/backup-db.sh
```

## Monitoring Setup

### Database Monitoring
- Monitor connection count
- Track query performance
- Set up disk space alerts
- Monitor memory usage

### Application Monitoring
- Set up error logging
- Monitor API response times
- Track user activity
- Set up health checks

## Troubleshooting

### Connection Issues
```bash
# Test database connectivity
telnet your-db-host 5432

# Check SSL requirements
psql "host=your-host port=5432 dbname=your-db user=your-user sslmode=require"
```

### Schema Issues
```bash
# Check table creation
\dt kisaan_*

# Verify constraints
\d kisaan_users
```

### Permission Issues
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

## Support

If you encounter issues:
1. Check the deployment logs
2. Verify database connectivity
3. Confirm environment variables are set
4. Test with a minimal database first

## Production Deployment Success ✅

Once deployed successfully, you'll have:
- ✅ Complete database schema
- ✅ Initial superadmin user
- ✅ Basic plans and categories
- ✅ All necessary indexes
- ✅ Proper constraints and relationships

Your KisaanCenter backend is now ready for production! 🎉