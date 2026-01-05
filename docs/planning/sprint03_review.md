# Sprint 3 Review

**Sprint:** 3
**Dates:** 29 December 2025 – 5 January 2026
**Duration:** ~5 working days (including New Year break)

---

## Summary

Sprint 3 delivered the complete event management system and full check-in flow. All 7 planned tickets were completed, including a sophisticated admin events page with inline editing, bulk event creation via calendar picker, multi-cohort support, and a unified check-in page that handles both registered and external users. The sprint exceeded initial scope by implementing quality-of-life features like late detection and performance optimizations.

---

## Metrics

| Metric | Value |
|--------|-------|
| Planned | 7 tickets, ~21 story points |
| Completed | 7 tickets, ~21 story points |
| Carried Over | 0 |
| Velocity | 21 points |
| Commits | 50+ |
| PRs Merged | 7 (#9–#15) |

---

## Completed Tickets

| Key | Summary | Points | Status |
|-----|---------|--------|--------|
| AP-17 | Admin events page (cohort events, registered users) | 3 | Done |
| AP-18 | Event create/edit/delete UI | 5 | Done |
| AP-19 | Schema: Check-in code + External attendance fields | 2 | Done |
| AP-20 | Cohorts service (listCohorts) | 2 | Done |
| AP-21 | Attendance service module | 3 | Done |
| AP-22 | Check-in page (unified flow) | 3 | Done |
| AP-23 | Bulk event creation with calendar picker | 3 | Done |

---

## Deliverables

**Admin Events Page (`/admin/events`):**
- Sortable columns (name, date, status, type)
- Filter by cohort dropdown
- Inline row editing with save/cancel
- Batch delete with confirmation modal
- Scrollable table with max 7 visible rows
- Check-in code display for public events

**Event Create/Edit/Delete UI:**
- Inline creation in new row
- Edit mode with row highlighting
- Mark-for-delete pattern with batch deletion
- Custom TimePicker component with validation
- Separate date and time inputs
- End time support

**Bulk Event Creation:**
- @event-calendar integration for date selection
- Click calendar dates to add to series
- Series modal for recurring event properties
- Auto-generated check-in codes
- Visual feedback with calendar highlighting

**Multi-Cohort Support:**
- Events can target multiple cohorts (cohortIds array)
- "Open" audience option for public events
- Audience dropdown with checkboxes
- Display shows cohort names or count

**Check-in Flow:**
- Unified `/checkin` page for all user types
- Access via check-in code (public events)
- Registered user check-in (apprentice link)
- External attendee form (name/email)
- Late detection with automatic status assignment
- Guard against duplicate check-ins
- Success/already-checked-in feedback

**Attendance Service:**
- `listEventAttendance(eventId)` — roster with attendee details
- `recordCheckIn(eventId, data)` — creates attendance record
- `isAlreadyCheckedIn(eventId, identifier)` — duplicate detection
- Handles both apprentice links and external attendees
- Performance optimized with parallel Airtable queries

**Schema Updates:**
- `Check-In Code` field on Events table
- `External Name` and `External Email` on Attendance table
- `isPublic` computed from cohort assignment
- Updated `docs/schema.md` with new fields

---

## Key Decisions

1. **Inline editing over modals:** Admin events page uses inline row editing for faster workflow, avoiding navigation to separate edit pages

2. **Mark-for-delete pattern:** Users mark rows for deletion, then confirm batch delete — prevents accidental single-click deletes

3. **Multi-cohort as array:** Changed from single `cohortId` to `cohortIds[]` array to support events targeting multiple cohorts

4. **"Open" as explicit option:** Added "Open" to audience dropdown to control `isPublic` flag, making external check-in opt-in per event

5. **Late detection at check-in time:** Attendance status auto-set to "Late" if check-in occurs after event start time

6. **Check-in code for access control:** Public events require code to prevent unauthorized check-ins while enabling unregistered users

---

## Design Decision: Multi-Cohort Events

Events can now target multiple cohorts simultaneously, useful for cross-cohort workshops and combined sessions.

**Implementation:**
- `cohortIds: string[]` replaces `cohortId: string`
- Dropdown with checkboxes for multi-select
- "Open" option controls `isPublic` independently
- Display shows names for 1-2 cohorts, count for 3+

| Selection | Display | isPublic |
|-----------|---------|----------|
| Open only | "Open" (green) | true |
| FAC30 | "FAC30" | false |
| FAC30, FAC31 | "FAC30, FAC31" | false |
| Open, FAC30 | "Open, FAC30" | true |
| 4+ selected | "4 selected" | depends |

---

## Design Decision: Calendar Integration

Replaced Schedule-X with @event-calendar/core for bulk event creation.

**Rationale:**
- Lighter bundle size
- Better Svelte 5 compatibility
- Simple click-to-select interaction
- Cleaner API for our use case

**Flow:**
1. Click calendar dates to add to series (highlights in green)
2. Click again to remove from series
3. Open series modal to set name, times, audience
4. Bulk create all selected dates as events

---

## Risks Identified

| Risk | Mitigation |
|------|------------|
| Public check-in abuse | Check-in codes required, time-window validation planned |
| Duplicate check-ins | `isAlreadyCheckedIn()` guard prevents double entries |
| Late status disputes | Clear 15-min grace period, based on event start time |
| Multi-cohort complexity | UI clearly shows selected count, validation prevents empty selection |

---

## Retrospective Notes

**What went well:**
- Completed all planned tickets with zero carryover
- Inline editing significantly improved admin UX
- Multi-cohort support added with minimal API changes
- Calendar integration smooth after switching libraries
- Late detection added as bonus feature

**What could improve:**
- Calendar library switch mid-sprint (Schedule-X → @event-calendar) added research time
- Some UI polish items deferred (noted in scratchpad.md)

**Deferred items (captured in scratchpad.md):**
- Add events button changes to cancel and scroll up
- td elements reduce padding
- Show "who I am" on check-in page
- Integration with LUMA
- Security for check-in time window
- Multiple cohorts display on events table

---

## Sprint Goal Assessment

**Goal:** Deliver the complete event management system and full check-in flow.

**Result:** Achieved. The system now supports:
- Full event CRUD with inline editing
- Bulk event creation via calendar
- Multi-cohort audience targeting
- Public/external user check-in
- Automatic late detection
- Attendance tracking with roster view

The sprint delivered a production-ready event management and check-in system that handles all identified user scenarios.

---

## Next Steps

With core functionality complete, next sprint can focus on:
- Email notifications (attendance chase, survey reminders)
- EPA alerts and progress tracking
- Admin dashboard with attendance metrics
- UI polish items from scratchpad
- LUMA integration exploration
