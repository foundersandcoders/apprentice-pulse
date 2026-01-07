# Attendance System Documentation

This document describes how attendance is calculated, stored, and displayed throughout the application.

## Table of Contents

1. [Airtable Schema](#airtable-schema)
2. [Status Types](#status-types)
3. [Data Flow Overview](#data-flow-overview)
4. [Statistics Calculation](#statistics-calculation)
5. [Known Issues](#known-issues)
6. [API Endpoints](#api-endpoints)
7. [UI Components](#ui-components)
8. [File Reference](#file-reference)

---

## Airtable Schema

### Attendance Table (`tblkDbhJcuT9TTwFc`)

| Field | Field ID | Type | Description |
|-------|----------|------|-------------|
| ID | `fldGdpuw6SoHkQbOs` | autoNumber | Auto-generated ID |
| Apprentice | `fldOyo3hlj9Ht0rfZ` | multipleRecordLinks | Link to Apprentices table |
| Event | `fldiHd75LYtopwyN9` | multipleRecordLinks | Link to Events table |
| Check-in Time | `fldvXHPmoLlEA8EuN` | dateTime | When the user checked in |
| Status | `fldew45fDGpgl1aRr` | singleSelect | Present/Absent/Late/Excused/Not Coming |
| External Name | `fldIhZnMxfjh9ps78` | singleLineText | For non-registered attendees |
| External Email | `fldHREfpkx1bGv3K3` | email | For non-registered attendees |

### Related Tables

**Events Table** has:
- `ATTENDANCE` field (`fldcPf53fVfStFZsa`) - reverse link to Attendance records
- `COHORT` field (`fldcXDEDkeHvWTnxE`) - which cohorts this event is for
- `DATE_TIME` field (`fld8AkM3EanzZa5QX`) - event start time (used for Present/Late determination)

**Apprentices Table** has:
- `COHORT` field (`fldbSlfS7cQTl2hpF`) - which cohort the apprentice belongs to

---

## Status Types

Defined in `src/lib/types/attendance.ts`:

```typescript
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused', 'Not Coming'] as const;
```

| Status | Description | Has Check-in Time | Counts as Attended |
|--------|-------------|-------------------|-------------------|
| Present | Checked in before event start | Yes | Yes |
| Late | Checked in after event start | Yes | Yes |
| Absent | Did not attend (explicit or implicit) | No | No |
| Excused | Absence excused by staff | No | No |
| Not Coming | Pre-declared absence | No | No |

### Status Determination Logic

When a user checks in (`src/lib/airtable/attendance.ts:51`):

```typescript
function determineStatus(eventDateTime: string | null): 'Present' | 'Late' {
    if (!eventDateTime) return 'Present';
    const eventTime = new Date(eventDateTime);
    const now = new Date();
    return now > eventTime ? 'Late' : 'Present';
}
```

---

## Data Flow Overview

### 1. Check-in Flow (Student)

```
POST /api/checkin
    │
    ├─► getApprenticeByEmail() - Is user a registered apprentice?
    │
    ├─► YES: Apprentice flow
    │   │
    │   ├─► getUserAttendanceForEvent() - Already have record?
    │   │   │
    │   │   ├─► Status = "Not Coming" → updateAttendance() to Present/Late
    │   │   │
    │   │   └─► Other status → Error "Already checked in"
    │   │
    │   └─► No record → createAttendance() with auto-determined status
    │
    └─► NO: External flow
        │
        └─► createExternalAttendance() with name/email
```

### 2. Mark Not Coming Flow

```
POST /api/checkin/not-coming
    │
    ├─► getApprenticeByEmail() - Must be registered apprentice
    │
    └─► markNotComing() - Creates record with status="Not Coming", no checkinTime
```

### 3. Staff Manual Check-in

```
POST /api/attendance
    │
    ├─► createAttendance() - Auto-determines Present/Late
    │
    └─► If status override provided → updateAttendance() to desired status
```

### 4. Status Update

```
PATCH /api/attendance/[id]
    │
    └─► updateAttendance(id, { status, checkinTime? })
```

---

## Statistics Calculation

### Core Calculation Function

Located in `src/lib/airtable/attendance.ts:407`:

```typescript
function calculateStats(attendanceRecords: Attendance[], totalEvents: number): AttendanceStats {
    const present = attendanceRecords.filter(a => a.status === 'Present').length;
    const late = attendanceRecords.filter(a => a.status === 'Late').length;
    const explicitAbsent = attendanceRecords.filter(a => a.status === 'Absent').length;
    const excused = attendanceRecords.filter(a => a.status === 'Excused').length;
    const notComing = attendanceRecords.filter(a => a.status === 'Not Coming').length;

    // IMPLICIT ABSENT: Events with no attendance record
    const recordedEvents = attendanceRecords.length;
    const missingEvents = totalEvents - recordedEvents;
    const absent = explicitAbsent + missingEvents;

    const attended = present + late;

    const attendanceRate = totalEvents > 0
        ? Math.round((attended / totalEvents) * 1000) / 10
        : 0;

    return {
        totalEvents,
        attended,
        present,
        late,
        absent,      // explicitAbsent + missingEvents
        excused,
        notComing,
        attendanceRate,
    };
}
```

### Key Formula

```
attended = present + late
absent = explicit_absent_records + (totalEvents - total_records)
attendanceRate = (attended / totalEvents) * 100
```

### Where Stats Are Calculated

| Function | Location | Usage |
|----------|----------|-------|
| `getApprenticeAttendanceStats()` | attendance.ts:552 | Individual apprentice page (no date filter) |
| `getApprenticeAttendanceStatsWithDateFilter()` | attendance.ts:440 | Apprentice list with term/date filtering |
| `getCohortAttendanceStats()` | attendance.ts:639 | Cohort-level stats |
| `getAttendanceSummary()` | attendance.ts:719 | Dashboard summary |

### How Each Function Determines "Relevant Events"

#### `getApprenticeAttendanceStats()` (no date filter)

```typescript
// Get events for apprentice's cohort
const allEvents = await getAllEvents();
const relevantEvents = cohortId
    ? allEvents.filter(e => e.cohortIds.includes(cohortId))
    : allEvents;

// Get ALL attendance for this apprentice (NOT FILTERED)
const allAttendance = await getAllAttendance();
const apprenticeAttendance = allAttendance.filter(a => a.apprenticeId === apprenticeId);

// Calculate stats
const stats = calculateStats(apprenticeAttendance, relevantEvents.length);
```

#### `getApprenticeAttendanceStatsWithDateFilter()` (with date filter)

```typescript
// Get events for apprentice's cohort, filtered by date
let relevantEvents = cohortId
    ? allEvents.filter(e => e.cohortIds.includes(cohortId))
    : allEvents;

if (startDate && endDate) {
    relevantEvents = relevantEvents.filter(e => {
        const eventDate = new Date(e.dateTime);
        return eventDate >= startDate && eventDate <= endDate;
    });
}

// Get attendance, filtered to only relevant events
let apprenticeAttendance = allAttendance.filter(a => a.apprenticeId === apprenticeId);

if (startDate && endDate) {
    const relevantEventIds = new Set(relevantEvents.map(e => e.id));
    apprenticeAttendance = apprenticeAttendance.filter(a => relevantEventIds.has(a.eventId));
}

const stats = calculateStats(apprenticeAttendance, relevantEvents.length);
```

### Trend Calculation

Compares last 4 weeks vs previous 4 weeks:

```typescript
function calculateTrend(currentRate: number, previousRate: number): AttendanceTrend {
    const change = currentRate - previousRate;
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (change > 2) direction = 'up';
    else if (change < -2) direction = 'down';

    return { direction, change, currentRate, previousRate };
}
```

---

## Known Issues

### BUG: Negative Absent Count (-2 in screenshot)

**Symptom**: The stats card shows `Absent: -2`

**Root Cause**: Mismatch between attendance records counted and events counted.

**How it happens**:

1. `getApprenticeAttendanceStats()` counts `relevantEvents` = events for the apprentice's cohort
2. BUT `apprenticeAttendance` includes ALL attendance records (not filtered to cohort events)
3. If apprentice attended events from OTHER cohorts, those records are counted but the events aren't

**Example**:
- Apprentice's cohort has 2 events
- Apprentice has 4 attendance records (2 for cohort + 2 for other events they visited)
- `calculateStats(4 records, 2 events)`
- `missingEvents = 2 - 4 = -2`
- `absent = 0 + (-2) = -2`

**Affected Functions**:
- `getApprenticeAttendanceStats()` - Does NOT filter attendance to relevant events
- `getApprenticeAttendanceStatsWithDateFilter()` - Only filters when date range is provided

**The Fix Would Be**: Filter `apprenticeAttendance` to only include records for events in `relevantEvents`:

```typescript
// MISSING in getApprenticeAttendanceStats():
const relevantEventIds = new Set(relevantEvents.map(e => e.id));
const filteredAttendance = apprenticeAttendance.filter(a => relevantEventIds.has(a.eventId));
const stats = calculateStats(filteredAttendance, relevantEvents.length);
```

### BUG: Inconsistency Between Stats and History

**Symptom**: Stats card shows different totals than history table

**Root Cause**: `getApprenticeAttendanceHistory()` includes ALL events the apprentice attended (line 918):

```typescript
// Add any events the apprentice has attendance for (regardless of cohort)
for (const eventId of attendanceMap.keys()) {
    relevantEventIds.add(eventId);
}
```

But stats only count cohort events. So:
- History shows: 4 events (all attended)
- Stats show: "2 of 2 events" (only cohort events)

---

## API Endpoints

### Check-in Endpoints

| Endpoint | Method | Description | File |
|----------|--------|-------------|------|
| `/api/checkin` | POST | Student/staff check-in | `src/routes/api/checkin/+server.ts` |
| `/api/checkin/not-coming` | POST | Mark as not coming | `src/routes/api/checkin/not-coming/+server.ts` |
| `/api/checkin/validate-code` | POST | Validate guest check-in code | `src/routes/api/checkin/validate-code/+server.ts` |

### Attendance Management

| Endpoint | Method | Description | File |
|----------|--------|-------------|------|
| `/api/attendance` | POST | Staff creates attendance | `src/routes/api/attendance/+server.ts` |
| `/api/attendance/[id]` | PATCH | Update status | `src/routes/api/attendance/[id]/+server.ts` |
| `/api/events/[id]/roster` | GET | Event roster with attendance | `src/routes/api/events/[id]/roster/+server.ts` |

### What Each Endpoint Writes to Airtable

| Endpoint | Creates Record | Updates Record | Fields Written |
|----------|---------------|----------------|----------------|
| POST `/api/checkin` | Yes (if no record) | Yes (if "Not Coming") | APPRENTICE, EVENT, CHECKIN_TIME, STATUS |
| POST `/api/checkin/not-coming` | Yes | No | APPRENTICE, EVENT, STATUS="Not Coming" |
| POST `/api/attendance` | Yes | Yes (if status override) | APPRENTICE, EVENT, CHECKIN_TIME, STATUS |
| PATCH `/api/attendance/[id]` | No | Yes | STATUS, CHECKIN_TIME |

---

## UI Components

### ApprenticeAttendanceCard.svelte

Location: `src/lib/components/ApprenticeAttendanceCard.svelte`

Displays:
- Name, cohort
- Attendance rate (color-coded: green ≥90%, yellow ≥80%, red <80%)
- Trend indicator (↗ up, ↘ down, → stable)
- Grid: Attended | Present | Late | Absent | Not Coming
- Total: "X of Y events"

### Apprentice List Page

Location: `src/routes/admin/attendance/apprentices/+page.svelte`

Features:
- Cohort multi-select with group toggles
- Filter modes: Terms (multi-select) OR Custom Date Range (mutually exclusive)
- Sortable table: Name, Cohort, Attendance Rate
- Row highlighting for low attendance (<80%)

Data loading: `+page.server.ts` calls `getApprenticeAttendanceStatsWithDateFilter()` for each apprentice

### Apprentice Detail Page

Location: `src/routes/admin/attendance/apprentices/[id]/+page.svelte`

Features:
- Stats card (using ApprenticeAttendanceCard)
- Full attendance history table
- Inline status editing (dropdown)
- Check-in time editing for Present/Late

Data loading: `+page.server.ts` calls:
- `getApprenticeAttendanceStats()` for the card
- `getApprenticeAttendanceHistory()` for the table

---

## File Reference

### Core Files

| File | Purpose |
|------|---------|
| `src/lib/airtable/config.ts` | Airtable table/field IDs |
| `src/lib/types/attendance.ts` | TypeScript types & interfaces |
| `src/lib/airtable/attendance.ts` | All attendance business logic |
| `src/lib/airtable/sveltekit-wrapper.ts` | Exports functions for routes |

### API Routes

| File | Purpose |
|------|---------|
| `src/routes/api/checkin/+server.ts` | Main check-in endpoint |
| `src/routes/api/checkin/not-coming/+server.ts` | Mark not coming |
| `src/routes/api/attendance/+server.ts` | Staff creates attendance |
| `src/routes/api/attendance/[id]/+server.ts` | Update attendance |
| `src/routes/api/events/[id]/roster/+server.ts` | Event roster with attendance |

### UI Pages

| File | Purpose |
|------|---------|
| `src/routes/admin/attendance/apprentices/+page.svelte` | Apprentice list |
| `src/routes/admin/attendance/apprentices/+page.server.ts` | List data loading |
| `src/routes/admin/attendance/apprentices/[id]/+page.svelte` | Apprentice detail |
| `src/routes/admin/attendance/apprentices/[id]/+page.server.ts` | Detail data loading |
| `src/routes/checkin/+page.svelte` | Student check-in page |
| `src/lib/components/ApprenticeAttendanceCard.svelte` | Stats card component |

### Tests

| File | Purpose |
|------|---------|
| `src/lib/airtable/attendance.spec.ts` | Unit tests for attendance functions |

---

## Data Flow Diagrams

### Stats Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        getApprenticeAttendanceStats()                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Get apprentice info (name, cohortId)                               │
│                         ↓                                               │
│  2. getAllEvents() → filter by cohortId → relevantEvents               │
│                         ↓                                               │
│  3. getAllAttendance() → filter by apprenticeId → apprenticeAttendance │
│                         ↓                                               │
│     ⚠️ BUG: apprenticeAttendance NOT filtered to relevantEvents        │
│                         ↓                                               │
│  4. calculateStats(apprenticeAttendance, relevantEvents.length)        │
│                         ↓                                               │
│     present = count where status='Present'                             │
│     late = count where status='Late'                                   │
│     explicitAbsent = count where status='Absent'                       │
│     excused = count where status='Excused'                             │
│     notComing = count where status='Not Coming'                        │
│                         ↓                                               │
│     missingEvents = relevantEvents.length - apprenticeAttendance.length│
│     absent = explicitAbsent + missingEvents  ← CAN BE NEGATIVE!        │
│                         ↓                                               │
│     attended = present + late                                          │
│     attendanceRate = (attended / totalEvents) * 100                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### History Display Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      getApprenticeAttendanceHistory()                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Get apprentice's cohortId                                          │
│                         ↓                                               │
│  2. Get all events                                                     │
│                         ↓                                               │
│  3. Get all attendance for this apprentice → attendanceMap             │
│                         ↓                                               │
│  4. Build relevantEventIds:                                            │
│     - Add all events for apprentice's cohort                           │
│     - Add all events apprentice has attendance for (ANY cohort)        │
│                         ↓                                               │
│  5. For each relevant event:                                           │
│     - If has attendance record → use that status                       │
│     - If no attendance record → status = 'Absent'                      │
│                         ↓                                               │
│  6. Sort by date (most recent first)                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```
