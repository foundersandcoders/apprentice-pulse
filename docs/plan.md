# Attendance System Refactor Plan

## Goal

Simplify attendance tracking to focus on what matters: **apprentices attending events assigned to their cohort**.

## Core Principles

1. An apprentice's attendance stats should ONLY include events where their cohort was assigned
2. No attendance record = implicit Not Check-in (staff don't manually mark absences)
3. Same filtering options (term/date) available on both list and detail pages
4. No duplicated code - reusable filter logic

---

## Page Names (for clarity)

| URL | Name | Purpose |
|-----|------|---------|
| `/admin/attendance/apprentices` | **Apprentice List** | List of apprentices with stats, cohort/term/date filters |
| `/admin/attendance/apprentices/[id]` | **Apprentice Detail** | Single apprentice's stats + history table |

---

## Current Problems

1. **Two nearly-identical functions** (`getApprenticeAttendanceStats` and `getApprenticeAttendanceStatsWithDateFilter`) with inconsistent filtering logic
2. **Attendance not filtered to cohort events** - causes negative absent counts when apprentice attended non-cohort events
3. **History includes non-cohort events** - confusing, doesn't match stats
4. **Multiple places determine "relevant events"** - logic is duplicated and inconsistent
5. **Detail page ignores filters** - no term/date filtering, inconsistent with list page
6. **Filter UI is duplicated** - if we add filters to detail page, we'd duplicate the filter components

---

## Proposed Changes

### Phase 1: Simplify Core Logic

#### 1.1 Single function for apprentice stats

Replace both `getApprenticeAttendanceStats()` and `getApprenticeAttendanceStatsWithDateFilter()` with one:

```typescript
async function getApprenticeStats(
  apprenticeId: string,
  options?: { startDate?: Date; endDate?: Date }
): Promise<ApprenticeAttendanceStats | null>
```

- Always filters events by cohort
- Always filters attendance to cohort events
- Date filtering is optional

#### 1.2 Extract "get relevant events for apprentice" helper

```typescript
function getEventsForApprentice(
  allEvents: EventForStats[],
  cohortId: string | null,
  options?: { startDate?: Date; endDate?: Date }
): EventForStats[]
```

Single source of truth for which events count toward an apprentice's stats.

#### 1.3 Extract "get attendance for events" helper

```typescript
function filterAttendanceToEvents(
  attendance: Attendance[],
  eventIds: Set<string>
): Attendance[]
```

Ensures attendance records always match the relevant events.

### Phase 2: Simplify History

#### 2.1 History only shows cohort events

Change `getApprenticeAttendanceHistory()` to only return events for the apprentice's cohort. This makes history consistent with stats.

If no attendance record exists for a cohort event → show as "Not Check-in" (implicit).

#### 2.2 Remove "add attendance from other cohorts" logic

Delete this block from `getApprenticeAttendanceHistory()`:
```typescript
// Add any events the apprentice has attendance for (regardless of cohort)
for (const eventId of attendanceMap.keys()) {
    relevantEventIds.add(eventId);
}
```

### Phase 3: Reusable Filter System

#### 3.1 Create shared filter types

```typescript
// src/lib/types/filters.ts
export interface AttendanceFilters {
  termIds?: string[];
  startDate?: Date;
  endDate?: Date;
}
```

#### 3.2 Create reusable filter component

```
src/lib/components/AttendanceFilters.svelte
```

- Term multi-select dropdown
- Custom date range inputs
- Mutually exclusive (terms OR date range)
- Emits filter changes via callback or URL params

Used by both **Apprentice List** and **Apprentice Detail** pages.

#### 3.3 Filter state via URL params

Both pages read filters from URL:
- `?terms=id1,id2` - term filtering
- `?startDate=2024-01-01&endDate=2024-03-31` - date range filtering

Detail page preserves filters when navigating from list:
```
/apprentices?terms=rec123 → /apprentices/recABC?terms=rec123
```

### Phase 4: Simplify calculateStats

#### 4.1 Add guard against negative values

Since we're filtering attendance to cohort events, this shouldn't happen, but add a safety net:

```typescript
const missingEvents = Math.max(0, totalEvents - recordedEvents);
```

### Phase 5: Clean Up

#### 5.1 Remove dead code

- Remove the old `getApprenticeAttendanceStats()` function
- Remove any unused parameters

#### 5.2 Update all call sites

- `apprentices/+page.server.ts` - use new unified function
- `apprentices/[id]/+page.server.ts` - use new unified function + add filter support

#### 5.3 Update tests

- Update `attendance.spec.ts` for new function signatures
- Add test case: apprentice with attendance outside their cohort (should be ignored)

---

## Files to Change

| File | Changes |
|------|---------|
| `src/lib/types/filters.ts` | **NEW** - shared filter types |
| `src/lib/airtable/attendance.ts` | Major refactor - merge functions, add helpers |
| `src/lib/components/AttendanceFilters.svelte` | **NEW** - reusable filter component |
| `src/routes/admin/attendance/apprentices/+page.svelte` | Extract filter UI to shared component |
| `src/routes/admin/attendance/apprentices/+page.server.ts` | Use new unified function |
| `src/routes/admin/attendance/apprentices/[id]/+page.svelte` | Add filter component, preserve filters from list |
| `src/routes/admin/attendance/apprentices/[id]/+page.server.ts` | Add filter support, use new unified function |
| `src/lib/airtable/attendance.spec.ts` | Update tests |

---

## What Stays the Same

- Event roster (`/api/events/[id]/roster`) - still shows everyone who checked in
- Check-in flow - unchanged
- Airtable schema - no changes needed
- ApprenticeAttendanceCard component - no changes (just receives corrected data)

---

## Decisions Made

1. **Implicit absents** - Keep current behavior (no record = absent). Staff don't manually mark absences.
2. **Date filtering on detail page** - Same filters as list page, passed via URL params.
3. **Filter UI** - Extract to reusable component, used by both pages.

---

## Implementation Order

1. [ ] Create `src/lib/types/filters.ts` with shared types
2. [ ] Add helper functions to `attendance.ts` (non-breaking)
3. [ ] Create new unified `getApprenticeStats()` function
4. [ ] Update `getApprenticeAttendanceHistory()` to only show cohort events
5. [ ] Create `AttendanceFilters.svelte` component (extract from list page)
6. [ ] Update **Apprentice List** page to use new component + function
7. [ ] Update **Apprentice Detail** page to support filters + use new function
8. [ ] Remove old functions
9. [ ] Update tests
10. [ ] Manual testing
