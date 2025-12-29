# Sprint 2 Review

**Sprint:** 2
**Dates:** 19–29 December 2025
**Duration:** ~6 working days (including Christmas break)

---

## Summary

Sprint 2 focused on authentication and event management foundations. Completed magic link auth with role-based protection, Resend email integration, and Events CRUD service. AP-17 (admin events page) was partially completed and refined after discovering additional requirements for public events.

---

## Metrics

| Metric | Value |
|--------|-------|
| Planned | 9 tickets, 18 story points |
| Completed | 7 tickets, 12 story points |
| Carried Over | 1 ticket (AP-17), partially done |
| Velocity | 12 points |
| Commits | 67 |
| PRs Merged | 7 (#2–#8) |

---

## Completed Tickets

| Key | Summary | Points | Status |
|-----|---------|--------|--------|
| AP-10 | Create Events table in Airtable | 1 | Done |
| AP-11 | Add Event link field to Attendance table | 1 | Done |
| AP-12 | Create Staff table in Airtable | 1 | Done |
| AP-13 | Set up Resend email integration | 2 | Done |
| AP-14 | Implement magic link authentication | 3 | Done |
| AP-15 | Role-based route protection (SvelteKit hooks) | 2 | Done |
| AP-16 | Event service module (Airtable CRUD) | 2 | Done |

---

## Carried Over

| Key | Summary | Points | Progress |
|-----|---------|--------|----------|
| AP-17 | Admin events page (cohort events, registered users) | 2 | ~25% - load function created |

**Reason:** During implementation, we discovered the need to handle public events (no cohort) and external attendees (not in Airtable). Story was split to deliver incrementally.

---

## New Ticket Created

| Key | Summary | Points |
|-----|---------|--------|
| AP-19 | Public events and external attendee check-in | 3 |

Split from AP-17 to handle:
- Events without cohort (open to all)
- External Name/Email fields on Attendance table
- Public check-in flow for unregistered attendees

---

## Deliverables

**Authentication System:**
- Magic link auth with 15-min JWT tokens
- Separate staff/student login flows
- 90-day session cookies
- `src/lib/server/auth.ts` — token generation/verification
- `src/lib/server/session.ts` — cookie helpers

**Route Protection:**
- `src/hooks.server.ts` — middleware for protected routes
- `/admin/*` → staff only
- `/checkin` → any authenticated user
- Login pages redirect if already authenticated

**Email Integration:**
- Resend configured for magic link delivery
- `src/lib/server/email.ts` — email service
- Environment variable for sender email

**Events Service:**
- Full CRUD operations in `src/lib/airtable/events.ts`
- TypeScript types in `src/lib/types/event.ts`
- Unit tests with Vitest mocks
- Manual test script for verification

**Schema Updates:**
- Events table with Name, DateTime, Cohort, EventType, Survey fields
- Attendance → Event link field
- Staff table with singleCollaborator field
- Updated `docs/schema.md` with relationships diagram

---

## Key Decisions

1. **Separate login flows:** Staff and students have distinct endpoints and pages for clearer UX
2. **Field IDs over names:** All Airtable queries use field IDs to prevent breakage if fields are renamed
3. **Factory pattern:** Airtable clients use factory functions for testability
4. **Story splitting:** AP-17 split into cohort-specific (AP-17) and public events (AP-19) for incremental delivery

---

## Design Decision: External Attendees

Discovered during AP-17 that we need to support:
- Open events (no cohort) visible to everyone
- External attendees not registered in Airtable

**Solution:** Add `External Name` and `External Email` fields to Attendance table.

| Field | Registered User | External User |
|-------|-----------------|---------------|
| Apprentice (link) | ✓ Populated | Empty |
| External Name | Empty | ✓ Populated |
| External Email | Empty | ✓ Populated |

Each attendance record has either an Apprentice link OR External fields (not both).

---

## Risks Identified

| Risk | Mitigation |
|------|------------|
| Public check-in abuse | Rate limiting, time-window validation |
| EventType changes in Airtable | Documented in README, requires code update |
| filterByFormula uses field names | Documented which queries use names vs IDs |

---

## Retrospective Notes

**What went well:**
- Authentication system working end-to-end
- Clean separation of concerns (auth, session, email, events)
- Good test coverage for auth and events modules
- Sprint review caught scope gap early

**What could improve:**
- Initial story estimation missed public events requirement
- Christmas break disrupted momentum

**Action items for Sprint 3:**
- Complete AP-17 (admin events page for cohort events)
- Implement AP-18 (event create/edit/delete UI)
- Begin AP-19 (public events + external check-in) if time permits

---

## Next Sprint Focus

Sprint 3 will deliver the complete event management system and full check-in flow:

**Event Management:**
- AP-17: Admin events page (display, filter by cohort)
- AP-18: Event create/edit/delete UI

**Check-in Flow:**
- AP-19: Public events + external attendee check-in
- Attendance service module (record check-ins to Airtable)
- Check-in UI for registered users (staff/students)

With authentication, route protection, and Events CRUD foundations in place, the project has momentum to deliver end-to-end functionality.
