# Sprint 4 Plan

**Sprint:** 4
**Start Date:** 6 January 2026
**Duration:** 1 week

---

## Sprint Goal

Deliver an attendance dashboard that provides visibility into individual and cohort attendance metrics, enabling staff to identify attendance patterns and intervene early when needed.

---

## Planned Tickets

| Key | Summary | Points | Priority |
|-----|---------|--------|----------|
| AP-24 | Attendance dashboard card on admin page | 2 | High |
| AP-25 | Individual apprentice attendance view | 3 | High |
| AP-26 | Cohort attendance metrics view | 3 | High |
| AP-27 | Attendance service - aggregate queries | 3 | High |
| AP-28 | UI polish and improvements | - | Ongoing |

**Total:** 5 tickets, ~11 story points + ongoing polish

---

## Ticket Details

### AP-24: Attendance dashboard card on admin page
Add a new card to the admin dashboard alongside the existing events card.

**Deliverables:**
- New "Attendance" card on `/admin` dashboard
- Summary metrics (total check-ins, overall attendance rate)
- Links to detailed attendance views
- Consistent styling with events card

**Dependencies:** AP-27 (service layer)

---

### AP-25: Individual apprentice attendance view
Track attendance history and rates for each apprentice.

**Deliverables:**
- `/admin/attendance` page with apprentice list
- Per-apprentice attendance rate percentage
- Attendance history (events attended/missed)
- Filter by cohort
- Sort by name or attendance rate
- Visual indicator for low attendance (<80%)

**Dependencies:** AP-27 (service layer)

---

### AP-26: Cohort attendance metrics view
Aggregate attendance metrics per cohort for comparison.

**Deliverables:**
- Cohort-level attendance statistics
- Per-cohort: total events, average attendance rate
- Trend indicator (improving/declining)
- Drill-down to cohort members
- Date range filter

**Dependencies:** AP-27 (service layer)

---

### AP-27: Attendance service - aggregate queries
Backend service functions for dashboard metrics.

**Deliverables:**
- `getApprenticeAttendanceStats(apprenticeId)` - individual stats
- `getCohortAttendanceStats(cohortId)` - cohort aggregate
- `getAttendanceSummary()` - overall summary for dashboard

**Returns per function:**
- Total events, attended count, attendance rate
- Late count, excused count
- Trend data (last 4 weeks vs previous period)

**No dependencies** - start here

---

### AP-28: UI polish and improvements
Ongoing improvements to pick up between main tasks.

**Items:**
- "Add events" button → "Cancel" when active, scroll up
- Reduce table cell padding
- Check-in page: show current user identity
- Check-in page: clearer already-checked-in feedback
- README: document permissions setup

**No dependencies** - work on as time permits

---

## Implementation Order

```
AP-27 (service layer)
    ↓
┌───┴───┐
↓       ↓
AP-25   AP-26  (can be parallel)
    ↓
  AP-24 (dashboard card - needs stats)
```

1. **AP-27** - Build service layer first (foundation)
2. **AP-25 + AP-26** - Build views in parallel (both use AP-27)
3. **AP-24** - Dashboard card last (integrates everything)

---

## Technical Approach

### Data Model
Leverage existing Attendance table with linked Apprentice and Event records.

```
Attendance record → Apprentice (link) → Cohort (link)
                 → Event (link) → Date, Cohort
                 → Status (Present/Not Check-in/Late/Excused/Absent)
```

### Aggregate Queries Strategy
Two approaches:
1. **Client-side aggregation**: Fetch all attendance records, compute in JS
2. **Airtable rollup fields**: Add rollup fields to Apprentice/Cohort tables

Recommend **client-side for MVP** - faster to implement, Airtable rollups require schema changes.

### UI Components
- Reuse table patterns from events page
- Add progress bar component for attendance rate
- Color coding: green (>90%), yellow (80-90%), red (<80%)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Performance with large datasets | Pagination, caching, lazy loading |
| Airtable rate limits on aggregates | Batch requests, cache results |
| Date range complexity | Start with fixed periods (week/month) |

---

## Success Criteria

- [ ] Staff can see overall attendance summary on dashboard
- [ ] Staff can view individual apprentice attendance rates
- [ ] Staff can compare cohort attendance metrics
- [ ] Low attendance (<80%) is visually highlighted
- [ ] Filters work correctly (cohort, date range)

---

## Out of Scope (Future Sprints)

- Email notifications for low attendance
- Automated alerts/interventions
- Historical trend charts
- Export to CSV/PDF
- LUMA integration
