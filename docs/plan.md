# AP-25 Individual apprentice attendance view

> Create a view to track individual apprentice attendance history and rates. List apprentices with metrics, per-apprentice attendance rate, history of events attended/missed, filter by cohort, sort options, and visual indicator for low attendance.

## Tasks

- [x] Create route and page structure for `/admin/attendance/apprentices`
- [x] Add server load function to fetch all apprentices with their attendance stats
- [x] Create ApprenticeAttendanceCard component to display individual metrics
- [x] Implement attendance history list showing events attended/missed per apprentice
- [x] Add cohort filter dropdown
- [x] Add sort functionality (by name, by attendance rate)
- [x] Add visual indicator for low attendance (below 80%)
- [x] Add click-through to detailed apprentice view
- [x] Write tests for the attendance apprentices page

## Notes

- Use existing `getApprenticeAttendanceStats` from attendance service (AP-27)
- Attendance rate = (attended / total events) * 100
- Low attendance threshold: 80%
- Filter by cohort uses existing cohort data
