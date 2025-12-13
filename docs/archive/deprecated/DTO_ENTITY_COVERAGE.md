# DTO & Entity Coverage (Draft)

Date: 2025-09-24

## Legend
- ✔ Present
- ✖ Missing
- △ Partial (out-of-sync or lacks variants: Create/Update/Response)

## Coverage Matrix
| Domain Model | Entity Class | DTO(s) | Gaps / Notes |
|--------------|--------------|--------|--------------|
| User | ✔ (`UserEntity`) | ✔ (`UserDTO`, Create/Update) | Password excluded from response (good). Need lightweight listing DTO? |
| Shop | ✔ (`ShopEntity`?) *Not viewed yet* | ✖ | Add CreateShopDTO / ShopResponseDTO |
| Product | ✔ (`ProductEntity`) | ✖ | Add ProductCreateDTO / ProductUpdateDTO / ProductResponseDTO |
| Category | ✖ | ✖ | Add Category DTOs + potential CategoryEntity (or map directly) |
| Plan | ✔ (`PlanEntity`) | ✖ | Add PlanCreateDTO / PlanResponseDTO (exclude internal pricing strategy if needed) |
| Transaction | ✔ (`TransactionEntity`) | ✔ (CreateTransactionDTO, TransactionResponseDTO) | Need UpdateTransactionDTO (whitelist) |
| Payment | ✖ (no PaymentEntity) | ✔ (Create, Response, Bulk, UpdateStatus) | Consider PaymentEntity for service mapping consistency |
| PaymentAllocation | ✖ | ✖ | Add for allocation visibility if exposed in reports |
| Commission | ✖ | ✔ | Optionally snapshot entity if business logic grows |
| Settlement | ✖ | ✖ | Add SettlementCreateDTO / SettlementResponseDTO / SettlementUpdateStatusDTO |
| CreditAdvance (credits) | ✖ | ✖ | Add CreditIssueDTO / CreditRepayDTO / CreditAdvanceResponseDTO |
| BalanceSnapshot | ✖ | ✖ | Internal only? If API exposes history, add BalanceSnapshotResponseDTO |
| TransactionLedger | ✖ | ✖ | Internal; add LedgerEntryResponseDTO if externalized / audit download feature |
| TransactionIdempotency | ✖ | ✖ | Should remain internal; maybe IdempotencyRecordDTO for diagnostics/admin |
| AuditLog | ✖ | ✖ | Add AuditLogResponseDTO (filterable fields) |
| PlanUsage | ✖ | ✖ | Add PlanUsageResponseDTO for quota dashboards |
| ShopCategory (join) | ✖ | ✖ | Usually no DTO; might add ShopCategoryAssignmentDTO |
| ShopProducts (join) | ✖ | ✖ | Add only if assignment operations formalized |

## High Priority Gaps (Affect External API Quality)
1. Product, Shop, Category DTOs missing – affects consistency with existing Transaction/Payment patterns.
2. Settlement & CreditAdvance lack DTO + schema validation (financial correctness risk).
3. UpdateTransactionDTO missing (currently inline whitelist logic in route).
4. ENUM centralization not yet reflected in DTO typing (will align post-enum strategy decision).

## Proposed DTO Additions (Phase 1)
```
Shop:
  CreateShopDTO { name, owner_id, plan_id?, address?, contact? }
  UpdateShopDTO { name?, plan_id?, address?, contact?, status? }
  ShopResponseDTO { id, name, owner_id, plan_id, status, created_at, updated_at }

Product:
  CreateProductDTO { name, category_id, price?, unit? }
  UpdateProductDTO { name?, price?, unit?, status? }
  ProductResponseDTO { id, name, category_id, price, unit, status, created_at, updated_at }

Category:
  CreateCategoryDTO { name, description? }
  UpdateCategoryDTO { name?, description?, status? }
  CategoryResponseDTO { id, name, status, created_at, updated_at }

Settlement:
  CreateSettlementDTO { shop_id, user_id, amount, reason }
  SettleSettlementDTO { settlement_id, status }
  SettlementResponseDTO { id, shop_id, user_id, amount, reason, status, settlement_date, created_at }

CreditAdvance:
  IssueCreditDTO { user_id, shop_id, amount, issued_date, due_date }
  RepayCreditDTO { credit_id, amount }
  CreditAdvanceResponseDTO { id, user_id, shop_id, amount, repaid_amount, status, issued_date, due_date }

Transaction:
  UpdateTransactionDTO { quantity?, unit_price?, status?, notes? }
```

## Entity Strategy Recommendation
- Keep Entity layer lean (structural mapping to DB). Only add Entities for domains needing: rich constructors, domain invariants, transformations, or repository layering.
- For primarily CRUD/simple reference tables (Category, Commission) Entities optional.

## Validation Layer Alignment
For each Create/Update DTO introduce Zod schema in `src/schemas/` mirroring transaction/payment pattern:
- Ensure numeric bounds (amount > 0, commission rate 0–100).
- Enforce allowed ENUM values via centralized enum constants.

## Next Steps
1. Confirm DTO priority order (default: Product, Shop, Category, Settlement, CreditAdvance, UpdateTransactionDTO).
2. Implement DTO interfaces + placeholder schemas (Phase 1 scaffold) – no service changes yet.
3. Integrate route handlers to use validation middleware for newly covered domains.

Reply "approve dto coverage" to proceed with Phase 1 scaffolding, or provide adjustments.
