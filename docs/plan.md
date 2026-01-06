# AP-26 Cohort attendance metrics view

> Create a view showing aggregate attendance metrics per cohort with drill-down capabilities and comparison features.

## Tasks

1. [ ] **Route Setup and Data Loading**
   - [x] 1.1 Create `/admin/attendance/cohorts/+page.server.ts` with load function
   - [x] 1.2 Fetch all cohorts and their attendance statistics
   - [x] 1.3 Handle date range filtering for metrics calculation

2. [ ] **Main Cohort Metrics Page**
   - [x] 2.1 Create `/admin/attendance/cohorts/+page.svelte` with responsive layout
   - [x] 2.2 Display cohorts table with sortable columns (name, attendance rate, trend)
   - [x] 2.3 Add visual indicators for attendance rate thresholds
   - [x] 2.4 Implement cohort comparison side-by-side view

3. [ ] **Interactive Features**
   - [x] 3.1 Add date range filter component
   - [x] 3.2 Implement drill-down links to individual cohort members
   - [x] 3.3 Add sorting functionality for all metrics columns
   - [x] 3.4 Create export functionality for cohort metrics

4. [ ] **Navigation Integration**
   - [x] 4.1 Add cohort metrics link to admin dashboard navigation
   - [x] 4.2 Update admin layout with proper breadcrumbs
   - [x] 4.3 Ensure consistent styling with existing admin pages

5. [ ] **Testing and Polish**
   - [ ] 5.1 Test with various cohort sizes and data scenarios
   - [ ] 5.2 Add loading states and error handling
   - [ ] 5.3 Ensure mobile responsiveness for the metrics table

## Notes

**Backend Already Complete:**
- `CohortAttendanceStats` interface exists with all required fields
- `getCohortAttendanceStats()` function calculates all metrics including trends
- Data includes: attendance rate, total events, apprentice count, trend analysis

**Acceptance Criteria:**
- List all cohorts with attendance statistics ✓ (backend ready)
- Per-cohort: total events, average attendance rate, trend ✓ (data available)
- Drill-down to see cohort members (needs implementation)
- Compare cohorts side-by-side (needs implementation)
- Date range filter for metrics (needs implementation)