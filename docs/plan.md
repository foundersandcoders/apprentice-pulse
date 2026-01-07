# AP-29 Add Cohort Overview stats panel to attendance page

> Add a cohort-level summary card to the Cohort Attendance page showing aggregated statistics (overall attendance %, status breakdown, apprentices at risk), mirroring the individual apprentice's "Attendance Stats" card pattern.

## Tasks

1. [x] **Add cohort-level stats type and aggregation**
   - [x] 1.1 Create `CohortOverviewStats` interface in `attendance.ts` with aggregated counts and apprentice-at-risk count
   - [x] 1.2 Create `calculateCohortOverview` helper function to aggregate stats from apprentice array

2. [x] **Create CohortOverviewCard component**
   - [x] 2.1 Create `CohortOverviewCard.svelte` component mirroring `ApprenticeAttendanceCard` layout
   - [x] 2.2 Display overall attendance percentage with color coding
   - [x] 2.3 Show Attended group (Present + Late) with totals
   - [x] 2.4 Show Excused standalone
   - [x] 2.5 Show Missed group (Not Check-in + Absent) with totals
   - [x] 2.6 Add "Apprentices at Risk" indicator (count below 80%)

3. [x] **Integrate into Cohort Attendance page**
   - [x] 3.1 Import and add `CohortOverviewCard` component above the apprentice table
   - [x] 3.2 Calculate cohort overview stats from existing apprentice data
   - [x] 3.3 Rename existing table section to "Individual Apprentices"

4. [x] **Validation and polish**
   - [x] 4.1 Run linter and fix any errors
   - [x] 4.2 Verify stats update correctly when filters change
   - [x] 4.3 Test with multiple cohorts selected

## Notes

- Reuse existing `STATUS_STYLES` from `attendance.ts` for consistent colors
- The `ApprenticeAttendanceStats` already contains all the data needed (present, late, absent, excused, notComing)
- Page structure after: Filters → Cohort Overview → Individual Apprentices → Attendance Trend
- Low attendance threshold is 80% (already defined in `ApprenticeAttendanceCard`)
