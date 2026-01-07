# Sprint 1 Review

**Sprint:** 1  
**Dates:** 15–18 December 2025  
**Duration:** 4 working days

---

## Summary

Sprint 1 focused on project foundation: repository setup, tech stack decisions, Airtable integration, and documentation. All planned tickets completed.

---

## Metrics

| Metric | Value |
|--------|-------|
| Planned | 7 tickets, 17 story points |
| Completed | 7 tickets, 17 story points |
| Velocity | 17 points |
| Commits | 15 |
| PRs Merged | 1 |

---

## Completed Tickets

| Key | Summary | Points | Status |
|-----|---------|--------|--------|
| AP-2 | Set up repo structure (folders, README, .gitignore) | 1 | Done |
| AP-3 | Choose tech stack and document decision | 2 | Done |
| AP-4 | Get Airtable API credentials, test connection | 2 | Done |
| AP-5 | Map existing Airtable bases (schema documentation) | 3 | Done |
| AP-6 | Write requirements document (user stories) | 3 | Done |
| AP-7 | Create architecture diagram (system components, data flow) | 3 | Done |
| AP-8 | Set up project scaffold, CI/CD pipeline, deploy to staging | 3 | Done |

---

## Deliverables

**Repository Structure:**
- SvelteKit + TypeScript project initialized
- ESLint configured
- Vitest testing framework
- `.env.example` for credential management

**CI/CD Pipeline:**
- GitHub Actions workflow: tests on PR, deploy on merge to main
- Vercel deployment operational

**Documentation:**
- `docs/architecture.md` — system design, tech stack rationale, data flows
- `docs/Artifacts.md` — EPA artefact tracking
- `docs/planning/sprint01.png` — sprint board snapshot
- `docs/report.md` — project report skeleton

**Airtable Integration:**
- Personal Access Token configured
- `scripts/test-airtable.ts` — verified read/write access to Learners base
- Schema documented with table and field IDs

**Requirements:**
- 16 user stories across 4 epics
- Priority matrix defined (P0–P3)

---

## Key Decisions

1. **Framework:** SvelteKit with TypeScript — lightweight, good DX, familiar from FAC training
2. **Auth:** Magic link via email — minimal friction for student check-ins
3. **Database:** Airtable API (no separate DB) — integrates with existing FAC workflows
4. **Notifications:** Discord webhooks for staff alerts, Resend for emails
5. **Hosting:** Vercel (temporary) → Heroku (production)
6. **Scheduled Jobs:** Vercel Cron for attendance chases, survey sends, alerts

---

## Risks Identified

| Risk | Mitigation |
|------|------------|
| Airtable rate limits (5 req/sec) | Batch operations, caching where possible |
| Schema changes by FAC staff | Document field IDs, build resilient lookups |

---

## Technical Decisions

**New Attendance Table Created:** `tblkDbhJcuT9TTwFc`

Replaced the legacy date-as-columns structure with a normalized table:
- Each attendance record is a row (not a column)
- Links to Apprentice via `fldOyo3hlj9Ht0rfZ`
- Date stored in `fldvXHPmoLlEA8EuN`
- Status (Present/Not Check-in/Late/Excused/Absent) via `fldew45fDGpgl1aRr`

This eliminates the need for dynamic field creation when adding events.

---

## Retrospective Notes

**What went well:**
- Clean project setup with all tooling working
- Airtable connection verified early — no blockers
- Documentation-first approach helped clarify scope

**What could improve:**
- No automated tests written yet beyond placeholder

**Action items for Sprint 2:**
- Begin event management UI (US-1)
- Set up Resend and Discord integrations

---

## Next Sprint Focus

Sprint 2 will target core functionality: event CRUD calendar interface and student check-in flow.