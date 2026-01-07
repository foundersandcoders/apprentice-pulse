# Plan: Staff-as-Apprentice Check-in

## Overview

Enable staff members who are also apprentices to check in using their apprentice profile instead of being treated as external guests.

## Current Behavior

1. Staff logs in with their staff email
2. `getApprenticeByEmail(staffEmail)` finds no match (apprentice uses learner email)
3. `checkInMethod = 'external'`
4. No "Absent" button, attendance not tracked against apprentice record

## Desired Behavior

1. Staff logs in with their staff email
2. Look up Staff record → get linked Apprentice → get learner email
3. Use learner email to find apprentice record
4. `checkInMethod = 'apprentice'`
5. Full apprentice experience: Absent button, proper attendance tracking

## Airtable Schema Changes (Already Done)

**Table:** Learners / Staff - Apprentice pulse (`tblJjn62ExE1LVjmx`)

| Field | ID | Type |
|-------|-----|------|
| Id | `fldbTKP32s3Soev91` | autoNumber |
| Staff Member | `fldHEHhQInmSdipn8` | singleCollaborator |
| Apprentice Link | `fldAMwe9jOOdwIyBY` | multipleRecordLinks |
| Learner email (from Apprentice Link) | `fldPjDZTSySzbefXz` | multipleLookupValues |

---

## Implementation Steps

### Step 1: Update Schema Documentation

**File:** `docs/schema.md`

Update the Staff - Apprentice Pulse section to include the new fields:
- Rename table to "Learners / Staff - Apprentice pulse"
- Add `Apprentice Link` field
- Add `Learner email (from Apprentice Link)` field

### Step 2: Update Airtable Config

**File:** `src/lib/airtable/config.ts`

Add new field constants:
```typescript
export const STAFF_FIELDS = {
  ID: 'fldbTKP32s3Soev91',
  STAFF_NAME: 'fldHEHhQInmSdipn8',  // existing
  APPRENTICE_LINK: 'fldAMwe9jOOdwIyBY',  // new
  LEARNER_EMAIL: 'fldPjDZTSySzbefXz',  // new (lookup)
};
```

### Step 3: Update Staff Type Definition

**File:** `src/lib/types/staff.ts` (or wherever Staff type is defined)

Add new optional field:
```typescript
interface Staff {
  id: string;
  name: string;
  email: string;
  learnerEmail?: string;  // new - apprentice email if staff is also apprentice
}
```

### Step 4: Update Staff Lookup Function

**File:** `src/lib/airtable/staff.ts`

Modify `getStaffByEmail()` to return the learner email:
```typescript
export async function getStaffByEmail(email: string): Promise<Staff | null> {
  // ... existing lookup logic ...

  return {
    id: record.id,
    name: record.fields[STAFF_FIELDS.STAFF_NAME].name,
    email: record.fields[STAFF_FIELDS.STAFF_NAME].email,
    learnerEmail: record.fields[STAFF_FIELDS.LEARNER_EMAIL]?.[0] || null,
  };
}
```

### Step 5: Update Check-in Page Server

**File:** `src/routes/checkin/+page.server.ts`

Modify the apprentice lookup logic:
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    return { authenticated: false, ... };
  }

  // Try to find apprentice by user's email first
  let apprentice = await getApprenticeByEmail(user.email);

  // If not found and user is staff, check for linked learner email
  if (!apprentice && user.role === 'staff') {
    const staff = await getStaffByEmail(user.email);
    if (staff?.learnerEmail) {
      apprentice = await getApprenticeByEmail(staff.learnerEmail);
    }
  }

  // ... rest of logic uses apprentice ...
};
```

### Step 6: Update Check-in API Endpoint

**File:** `src/routes/api/checkin/+server.ts`

Apply same logic to the check-in POST handler:
```typescript
// When creating attendance, use the linked apprentice if available
let apprentice = await getApprenticeByEmail(session.email);

if (!apprentice) {
  const staff = await getStaffByEmail(session.email);
  if (staff?.learnerEmail) {
    apprentice = await getApprenticeByEmail(staff.learnerEmail);
  }
}
```

### Step 7: Update Absent API Endpoint

**File:** `src/routes/api/checkin/absent/+server.ts`

Apply same logic for marking absent.

### Step 8: Add Helper Function (Optional)

Consider creating a helper to DRY up the logic:
```typescript
// src/lib/airtable/apprentice.ts
export async function getApprenticeForUser(email: string, role: UserRole): Promise<Apprentice | null> {
  // Direct lookup first
  let apprentice = await getApprenticeByEmail(email);

  // Staff fallback: check linked learner email
  if (!apprentice && role === 'staff') {
    const staff = await getStaffByEmail(email);
    if (staff?.learnerEmail) {
      apprentice = await getApprenticeByEmail(staff.learnerEmail);
    }
  }

  return apprentice;
}
```

---

## Testing

1. Log in as staff member who is NOT an apprentice
   - Should still work as external check-in
   - No Absent button

2. Log in as staff member who IS an apprentice (has Apprentice Link)
   - Should see Absent button
   - Attendance should be recorded against apprentice record
   - Stats should update correctly

3. Log in directly as apprentice (using learner email)
   - Should work as before (no regression)

---

## Files to Modify

| File | Change |
|------|--------|
| `docs/schema.md` | Update Staff table documentation |
| `src/lib/airtable/config.ts` | Add new field IDs |
| `src/lib/types/staff.ts` | Add learnerEmail to Staff type |
| `src/lib/airtable/staff.ts` | Return learnerEmail from lookup |
| `src/routes/checkin/+page.server.ts` | Add staff→apprentice fallback lookup |
| `src/routes/api/checkin/+server.ts` | Add staff→apprentice fallback lookup |
| `src/routes/api/checkin/absent/+server.ts` | Add staff→apprentice fallback lookup |

---

## Risks & Considerations

1. **Multiple learner emails**: The lookup field is `multipleLookupValues` - handle case where array has multiple values (use first one)

2. **Caching**: If staff data is cached, changes to Apprentice Link won't take effect immediately

3. **Auth flow**: This doesn't affect authentication - staff still logs in with staff email, we just use the linked apprentice for attendance

4. **Existing attendance**: Historical external attendance for staff-apprentices won't be linked to apprentice records (acceptable for MVP)
