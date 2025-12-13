# Integration Test Coverage Checklist

Use this checklist for every backend module to ensure complete integration test coverage.

## 1. CRUD Operations
- [ ] List all entities (GET /)
- [ ] Get single entity by ID (GET /:id)
- [ ] Create entity (POST /)
- [ ] Update entity (PUT/PATCH /:id)
- [ ] Delete entity (DELETE /:id)

## 2. Business Flows
- [ ] Assignment/Unassignment flows (if applicable)
- [ ] All business rules and validation logic
- [ ] Edge cases (e.g., duplicate, invalid references)

## 3. Error Handling
- [ ] Invalid input (missing/invalid fields)
- [ ] Unauthorized/forbidden access
- [ ] Not found (invalid ID)
- [ ] Duplicate creation
- [ ] Foreign key constraint errors

## 4. Security
- [ ] Authenticated access required
- [ ] Role-based access control
- [ ] Forbidden for unauthorized roles

## 5. Response Format
- [ ] All responses follow `{ success, message, data }` format
- [ ] Error responses are user-friendly

## 6. Test Data
- [ ] Seeders provide required data for tests
- [ ] Tests clean up after themselves (if needed)

## 7. Automation
- [ ] Tests run in CI/CD pipeline
- [ ] All tests pass before merge/deploy

---

**Tip:** Update this checklist as new business requirements or modules are added.
