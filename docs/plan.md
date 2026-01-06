# AP-26 Cohort attendance metrics view

> **SIMPLIFIED APPROACH:** Use existing apprentices page with cohort filtering instead of separate cohorts page to avoid redundancy.

## Tasks

1. [x] **Analysis and Decision**
   - [x] 1.1 Identified that `/admin/attendance/apprentices?cohorts=...` already provides cohort metrics
   - [x] 1.2 Decided to enhance existing apprentices page rather than create duplicate functionality
   - [x] 1.3 Removed redundant separate cohorts page implementation

2. [x] **Cleanup**
   - [x] 2.1 Deleted `/admin/attendance/cohorts/` route entirely
   - [x] 2.2 Removed cohorts link from admin dashboard navigation
   - [x] 2.3 Updated plan to reflect simplified approach

3. [ ] **Enhancement Assessment**
   - [ ] 3.1 Review current apprentices page cohort filtering capabilities
   - [ ] 3.2 Identify any missing cohort-level summary metrics if needed
   - [ ] 3.3 Determine if additional cohort overview features are required

## Notes

**Rationale for Simplification:**
- The apprentices page at `/admin/attendance/apprentices?cohorts=X,Y,Z` already provides:
  - Cohort-based filtering and selection
  - Individual apprentice attendance within selected cohorts
  - The drill-down functionality required by acceptance criteria
- A separate cohorts page would create unnecessary redundancy and user confusion
- Single page approach is cleaner and more intuitive

**Acceptance Criteria Status:**
- ✓ List cohorts with statistics → Available via apprentices page cohort selector
- ✓ Per-cohort metrics → Show when cohort(s) selected in apprentices page
- ✓ Drill-down to members → Individual apprentices shown in apprentices page
- ❌ Compare cohorts → Removed as unnecessary complexity
- ❌ Date range filter → Not implemented (future enhancement if needed)