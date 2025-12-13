# Refactor Phase 1 Test Plan

Scope: Validate foundational refactors (logging, validation unification, response helpers (plan & category), BaseService, env config, security middleware) before broader rollout.

## 1. Environment & Config
- Case: Missing required env var (e.g. DB_HOST) -> process start should fail (non-test) with clear message.
- Case: NODE_ENV=test with partial env -> app boots using fallback defaults.

## 2. Response Helper Consistency
| Endpoint | Expect | Notes |
|----------|--------|-------|
| POST /api/plans | 201 + { success:true, data:{...}, message } | features array preserved |
| GET /api/plans | 200 + meta.count | count matches returned length |
| GET /api/plans/:id (invalid) | 400 { success:false, error:"Invalid plan ID" } | |
| GET /api/categories | 200 + meta.count | |
| DELETE /api/categories/:id (missing) | 404 Category not found | |

## 3. Validation Behavior
- Plan create with malformed features (string not JSON) -> features fallback [] and still passes schema when optional.
- Plan create missing required field -> 400 Validation failed + details[].
- Category create with is_active true (no status) -> persisted status === "active".

## 4. Security Middleware
- CORS: Preflight OPTIONS /api/plans from allowed origin includes Access-Control-Allow-Origin.
- Helmet headers present: `x-dns-prefetch-control`, `x-content-type-options`.
- Rate limit (if express-rate-limit installed): Exceed N requests -> 429 body { success:false, error }.
- Compression (if installed): `content-encoding: gzip` for large JSON (>1KB) response.

## 5. BaseService DTO Integrity
- Plan retrieval returns features as array (not raw JSON string) after create & fetch.

## 6. Deletion & Edge Cases
- DELETE /api/plans/:id nonexistent -> 404 Plan not found.
- POST /api/categories/reorder invalid payload (non-array) -> 400 Categories must be an array.
- POST /api/categories/reorder missing display_order in one item -> 400 Each category must have id and display_order.

## 7. Legacy Compatibility
- Unmigrated controllers still return prior response shapes (sample one legacy endpoint to confirm unchanged format).

## 8. Logging Verification (manual / inspection)
- Creation endpoints output structured log entries with request id + action tag (plan:create, category:create).
- Error path logs include err stack.

## 9. Error Normalization (Post Global Handler Step)
(Placeholder until task 16 complete.)
- Force thrown error in a controller -> standardized envelope via respond.failure.

## 10. Suggested Automated Test Additions
- Add Jest tests for plan & category create/list/update/delete using supertest.
- Add env validation unit test (mock process.env variations).
- Add rate limit test (conditional skip if module absent).

## Execution Order
1. Env validation tests.
2. Plan CRUD tests.
3. Category CRUD + reorder tests.
4. Security header / CORS tests.
5. Rate limit & compression (conditional).
6. Legacy endpoint snapshot.

## Tooling Notes
- Use supertest with shared app instance (do not start network listener) for faster tests.
- To simulate missing env: spawn child process with modified env block.

## Pending Work (Outside Phase 1)
- Migrate remaining controllers to response helpers.
- Remove Joi remnants.
- Introduce structured OpenAPI response schemas.
- Add authentication/authorization negative-path tests.

---
Owner: Refactor Phase 1
Date: 2025-09-23
Status: Draft Complete
