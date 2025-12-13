# Commission Override Logic

## Purpose
Allow negotiated (special) commission percentages per farmer while preserving immutable historical commission values on each transaction row.

## Data Model
Column added to `kisaan_users`:
```
custom_commission_rate NUMERIC(5,2) NULL CHECK (custom_commission_rate >= 0 AND custom_commission_rate <= 100)
```
Null means: fall back to shop default.

Each transaction continues to persist `commission_rate` to freeze economic context at creation time.

## Precedence
1. Explicit `commission_rate` provided in transaction payload (future / extended usage)
2. Farmer `custom_commission_rate`
3. Shop `commission_rate`
4. System fallback (10%)

Invalid values (<0 or >100) are rejected.

## Endpoint
`PATCH /api/users/:id/commission`

Body:
```
{ "custom_commission_rate": 12.5 }   // set
{ "custom_commission_rate": null }   // clear
```

Auth: `superadmin` only (extendable to owner if policy changes).

Response:
```
{ "success": true, "data": { "id": 123, "custom_commission_rate": 12.5 } }
```

## Rationale
Storing the rate per transaction avoids recomputation if the farmer or shop commission changes later. A versioned history table was deferred for simplicity; can be introduced if retroactive audits require temporal rate lineage.

## Future Enhancements
* Add optional rate history table (`farmer_commission_versions`) with effective_from timestamps.
* Expose commission breakdown analytics per farmer vs shop.
* Add validation to prevent setting a farmer override higher than a policy threshold.

---
Last updated: 2025-09-23