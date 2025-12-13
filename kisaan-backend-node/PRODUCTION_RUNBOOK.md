# Production Rollout Runbook - DB Migration & Backend Fixes

## Overview
This runbook covers the deployment of database migrations and backend fixes for KisaanCenter. The changes include monetary precision updates, payment date nullability fixes, product denormalization, commission deduplication, and timestamp consistency.

## Pre-Deployment Checklist
- [ ] Schedule maintenance window (2-4 hours)
- [ ] Notify stakeholders of downtime
- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify rollback procedures
- [ ] Confirm monitoring alerts are set up

## Deployment Steps

### Phase 1: Pre-Migration Checks
```bash
# 1. Create database backup
pg_dump kisaan_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify current schema state
psql kisaan_prod -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'kisaan_%';"

# 3. Check for any NULL payment_dates
psql kisaan_prod -c "SELECT COUNT(*) FROM kisaan_payments WHERE payment_date IS NULL;"

# 4. Check monetary column types
psql kisaan_prod -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'kisaan_payments' AND column_name = 'amount';"
```

### Phase 2: Apply Migrations
```bash
# Deploy backend code with new migrations
cd /path/to/kisaan-backend-node
git pull origin main
npm install
npm run migrate

# Verify migrations applied
psql kisaan_prod -c "SELECT name, executed_at FROM _migrations ORDER BY executed_at DESC LIMIT 10;"
```

### Phase 3: Post-Migration Validation
```bash
# Run validation queries
psql kisaan_prod -f src/migrations/20251018_07_validation_queries.sql

# Check for any issues
psql kisaan_prod -c "SELECT COUNT(*) FROM kisaan_payments WHERE payment_date IS NULL;"  # Should be 0
psql kisaan_prod -c "SELECT COUNT(*) FROM kisaan_commissions GROUP BY shop_id, rate, type HAVING COUNT(*) > 1;"  # Should be 0
```

### Phase 4: Backend Deployment
```bash
# Build and deploy backend
npm run build
pm2 restart kisaan-backend

# Verify service health
curl -f http://localhost:3000/api/health || exit 1
```

### Phase 5: Smoke Tests
```bash
# Test critical endpoints
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","role":"FARMER","shop_id":1}'

curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"shop_id":1,"farmer_id":1,"buyer_id":1,"product_id":1,"quantity":10,"unit_price":100}'

curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":1,"payer_type":"BUYER","payee_type":"SHOP","amount":1000,"method":"CASH"}'
```

## Rollback Procedures

### If Migration Fails
```bash
# Restore from backup
psql kisaan_prod < backup_file.sql

# Rollback code deployment
git checkout previous_commit
npm run build
pm2 restart kisaan-backend
```

### If Post-Migration Issues Found
```bash
# For payment_date issues
psql kisaan_prod -c "UPDATE kisaan_payments SET payment_date = NOW() WHERE payment_date IS NULL;"

# For commission duplicates
psql kisaan_prod -c "DELETE FROM kisaan_commissions c1 USING kisaan_commissions c2 WHERE c1.id > c2.id AND c1.shop_id = c2.shop_id AND c1.rate = c2.rate AND c1.type = c2.type;"
```

## Monitoring & Alerts
- Monitor application logs for errors
- Check payment creation success rate
- Monitor database performance
- Alert on any payment_date NULL insertions
- Watch for commission calculation issues

## Success Criteria
- [ ] All migrations applied without errors
- [ ] No NULL payment_dates in payments table
- [ ] No duplicate commissions
- [ ] Monetary columns use NUMERIC(18,2)
- [ ] Timestamps use TIMESTAMPTZ
- [ ] Backend service starts successfully
- [ ] Smoke tests pass
- [ ] No increase in error rates

## Post-Deployment
- [ ] Remove maintenance page
- [ ] Notify stakeholders of completion
- [ ] Monitor for 24 hours
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned

## Optional: Run migrations automatically on backend start

- **Env var:** `RUN_MIGRATIONS_ON_STARTUP=true` will cause the backend to run the project's migration runner during process startup.
- **Recommended:** Prefer running `npm run migrate` as part of your CI/CD deployment pipeline rather than enabling runtime migrations in production. Enabling runtime migrations can cause startup delays and can make rolling back harder if migrations are destructive.
- **When to enable:** Use `RUN_MIGRATIONS_ON_STARTUP` only for controlled environments (canary/staging) or very small maintenance windows where you accept migrations running during process boot.
- **Caveat:** The process will fail to start if migrations error; ensure backups and monitoring are in place before enabling.