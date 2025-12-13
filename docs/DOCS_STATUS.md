# Documentation Lifecycle Status

Legend:
- ✅ Active: Canonical, keep updated
- ℹ️ Authoritative: Point-in-time but still primary reference
- ⚠️ Deprecated: Retained for historical/audit only (do not update)
- 🧩 Consolidate: Will be merged into newer structured docs then removed
- 📝 Planned: Placeholder / to be created

## Index
| File | Status | Replacement / Canonical Source | Notes |
|------|--------|---------------------------------|-------|
| CORE_IDEA.md | ✅ Active | — | Core product vision & scope |
| FRONTEND_ARCHITECTURE.md | ✅ Active | — | Frontend layer patterns & helpers |
| TRANSACTION_FLOW.md | ✅ Active | — | Canonical derived field & payload flow |
| IMPLEMENTATION_COMPLETE_REPORT.md | ℹ️ Authoritative | — | Latest milestone consolidation |
| IMPLEMENTATION_COMPLETE.md | ⚠️ Deprecated | IMPLEMENTATION_COMPLETE_REPORT.md | Historical milestone snapshot |
| OWNER_MVP_IMPLEMENTATION_COMPLETE.md | ⚠️ Deprecated | IMPLEMENTATION_COMPLETE_REPORT.md | Redundant milestone doc |
| TRANSACTION_LOGIC_AND_EDGE_CASES.md | ⚠️ Deprecated | TRANSACTION_FLOW.md | Logic merged into flow doc |
| REAL_API_TEST_FIXES.md | ⚠️ Deprecated | COMPREHENSIVE_TEST_CASES.md | Point fix log no longer maintained |
| CRITICAL_API_FIXES_SUMMARY.md | ⚠️ Deprecated | IMPLEMENTATION_COMPLETE_REPORT.md | Folded into consolidated report |
| TEST_FIXES_SUMMARY.md | ⚠️ Deprecated | COMPREHENSIVE_TEST_CASES.md | Legacy test tracking |
| MODEL_FIXES_SUMMARY.md | ⚠️ Deprecated | TYPE_SYSTEM_FIXES.md | Model/type improvements centralized |
| OPTIMIZATION_SUMMARY.md | ⚠️ Deprecated | IMPROVEMENT_OPPORTUNITIES.md | Optimization lines migrated |
| OWNERLAYOUT_IMPROVEMENTS.md | ⚠️ Deprecated | UI_IMPROVEMENTS_SUMMARY.md | Will be merged into history doc |
| UI_IMPROVEMENTS_SUMMARY.md | ⚠️ Deprecated | (future) UI_IMPROVEMENTS_HISTORY.md | Pending consolidation |
| improvemnts.md | ⚠️ Deprecated | IMPROVEMENT_OPPORTUNITIES.md | Misspelled legacy file |
| KisaanCenter_Master_Documentation.md | ⚠️ Deprecated | CORE_IDEA.md + SYSTEM_BRAIN.md successors | Master doc split |
| KisaanCenter_Technical_Implementation_Guide.md | ⚠️ Deprecated | SYSTEM_BRAIN.md + FRONTEND_ARCHITECTURE.md | Superseded by modular docs |
| SYSTEM_BRAIN.md | 🧩 Consolidate | ARCHITECTURE_BLUEPRINT.md (planned) | To be segmented & merged |
| IMPROVEMENT_OPPORTUNITIES.md | ✅ Active | — | Central improvement backlog |
| DEVELOPMENT_RULEBOOK.md | ✅ Active | — | Standards & conventions |
| DOCUMENTATION_HUB.md | ✅ Active | DOCS_STATUS.md | Master index |

## Next Actions
- Create `ARCHITECTURE_BLUEPRINT.md` to absorb SYSTEM_BRAIN structural content.
- Create `UI_IMPROVEMENTS_HISTORY.md` and merge owner layout + UI summaries.
- Audit links across repo to ensure they prefer active docs.
- After consolidation, remove deprecated files in a cleanup PR (non-urgent).

## Policy
Only files with status ✅ or ℹ️ should be updated going forward. Deprecated files remain frozen except for banner clarity.
