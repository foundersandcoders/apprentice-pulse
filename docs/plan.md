# AP-27 Attendance service - aggregate queries

> Extend attendance service with aggregate query functions for dashboard metrics. Functions needed: getApprenticeAttendanceStats, getCohortAttendanceStats, getAttendanceSummary. Returns: total events, attended count, attendance rate, late count, excused count, trend data.

## Tasks

- [x] Define TypeScript types for attendance stats (AttendanceStats, ApprenticeAttendanceStats, CohortAttendanceStats, AttendanceSummary)
- [x] Add getAllAttendance() helper to fetch all attendance records
- [x] Add getAllEvents() helper to fetch all events (needed for total event counts)
- [x] Implement getApprenticeAttendanceStats(apprenticeId) - individual apprentice stats
- [x] Implement getCohortAttendanceStats(cohortId) - cohort aggregate stats
- [x] Implement getAttendanceSummary() - overall summary for dashboard card
- [x] Add trend calculation helper (compare last 4 weeks vs previous 4 weeks)
- [x] Write tests for getApprenticeAttendanceStats
- [x] Write tests for getCohortAttendanceStats
- [x] Write tests for getAttendanceSummary

## Notes

- Existing attendance service is in `src/lib/airtable/attendance.ts`
- Existing types in `src/lib/types/attendance.ts`
- Cohort data available via `listCohorts()` and `getApprenticesByCohortId()` in airtable.ts
- Events have cohortIds array (multi-cohort support)
- Status values: Present, Absent, Late, Excused
- Client-side aggregation approach (no Airtable schema changes)
- Attendance rate = (Present + Late) / Total events for cohort
