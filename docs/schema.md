# Airtable Schema

Schema mapping for Apprentice Pulse. Includes table and field IDs for API integration.

**Base:** Learners (`app75iT6Or0Rya1KE`)

## Relationships Overview

```
Apprentices (tbl0HJM700Jmd5Oob) - primary learner record
  ├── Attendace - Apprentice Pulse (tblkDbhJcuT9TTwFc)
  │     └── Event → Events - Apprentice Pulse
  ├── Weekly learning log (tblL2y5NRjyml8XU8)
  ├── Progress Reviews (Apprentices) (tblXMWiU6DmrrBAZ7)
  ├── Support log (tblWINmz4JDtVUucD)
  ├── Learner Touchpoint Log (tbl2O3QcYpss1SaP4)
  └── Cohorts (tbllAnSw8VPYFAa1a)
        └── Events - Apprentice Pulse (tblkbskw4fuTq0E9p)

Progress Reviews (Employer Feedback) (tblwdSYGgGMXJ1DX7)
  └── Apprentice record → links to Apprentices
```

---

## Apprentices

**Table ID:** `tbl0HJM700Jmd5Oob`

Primary learner record for apprenticeship programme.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Name | `fldtvHx7pP5FgUWvh` | formula | Display name |
| Cohort # | `fldbSlfS7cQTl2hpF` | multipleRecordLinks | Links to Cohorts |
| Learner status | `fldFP9b6CfhNzeVNQ` | singleSelect | Active/Withdrawn/Completed |
| Learner email | `fldC3xdKGd96U0aoZ` | multipleLookupValues | Personal email |
| work-email | `fldDkXJbAoHCWteLQ` | email | Work email for comms |
| Start date | `fldetrfOkKiNQe0Jg` | multipleLookupValues | Programme start |
| Planned end date | `fldU3mMdadkXpop4f` | multipleLookupValues | Expected EPA date |
| Line manager email | `fldIX7ouzUrWIBDGM` | email | For employer comms |
| Grade | `fldOwQE4sbF55JjfO` | singleSelect | Current grade |
| Areas of concern | `fldeKeKPDtY2e3JZ2` | multipleSelects | Risk flags |
| Concerns status | `fldXuvUDRGoCCoyf2` | multipleSelects | Status of concerns |
| Intervention | `fldxcqXDfAKXILqY1` | multipleSelects | Intervention actions |
| Progress reviews | `fldybjnraD1iyKbLK` | multipleRecordLinks | Links to review records |
| Company Name | `fldvG5XPJW2FslqhE` | multipleRecordLinks | Employer |
| Given names | `fldWTDHMrE2asl2m9` | singleLineText | First name |
| Family name | `flduP7HvIAwjjwUeb` | singleLineText | Last name |

---

## Attendace - Apprentice Pulse

**Table ID:** `tblkDbhJcuT9TTwFc`

Attendance tracking using a junction table pattern (one record per apprentice per event).

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Id | `fldGdpuw6SoHkQbOs` | autoNumber | Record ID |
| Apprentice | `fldOyo3hlj9Ht0rfZ` | multipleRecordLinks | Links to Apprentices |
| Event | `fldiHd75LYtopwyN9` | multipleRecordLinks | Links to Events |
| Checkin Time | `fldvXHPmoLlEA8EuN` | dateTime | When student checked in |
| Status | `fldew45fDGpgl1aRr` | singleSelect | Attendance status (Present, Absent, Late, Excused) |
| Date Time (from Event) | `fldokfSk68MhJGlm6` | multipleLookupValues | Event date/time lookup |
| FAC Cohort (from Event) | `fldkc9zLJe7NZVAz1` | multipleLookupValues | Cohort lookup from Event |
| External Name | `fldIhZnMxfjh9ps78` | singleLineText | Name for non-registered attendees |
| External Email | `fldHREfpkx1bGv3K3` | email | Email for non-registered attendees |

---

## Weekly learning log

**Table ID:** `tblL2y5NRjyml8XU8`

OTJ hours tracking and support request flags.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Id | `fld4c6AMSjgJneTUp` | autoNumber | Record ID |
| Apprentice | `fldPJn6jfg3CfrZbB` | multipleRecordLinks | Links to Apprentices |
| Created | `fldOHvYPC15m1kz0L` | createdTime | Submission date |
| Created By | `fldgL5YnACq2N5sTd` | createdBy | Submitter |
| Status | `fldyCn6T3gvOwdY04` | singleSelect | Review status |
| Total Hours | `fldFuh8iNxzNzmWRE` | formula | Classroom + Self-directed |
| Classroom | `fld9M7tHmkuu8MrPu` | number | OTJ classroom hours |
| Self-directed | `fldacrQ8OZvroBIKb` | number | OTJ self-study hours |
| Week | `fldEXBZgHzHE3Hqae` | formula | Week number |
| Last week | `fldUO14QiXPNkTDI5` | multilineText | Summary of last week |
| Next week | `fldgLMzqXbsmvAwVT` | multilineText | Plans for next week |
| Blockers | `fldm736amNAm2haOg` | multilineText | Issues reported |
| Support Request | `fld3bvkUutoLVBIFH` | singleSelect | Support flag (triggers alert) |
| FAC Team | `fldqekf9h0fGWAx8D` | singleCollaborator | Assigned staff |

---

## Progress Reviews (Apprentices)

**Table ID:** `tblXMWiU6DmrrBAZ7`

Quarterly review records completed by apprentices.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Review record | `fld0Cs3jv58PVnmeH` | formula | Record identifier |
| Apprentice | `fldGK9vJBC69qbdfa` | multipleRecordLinks | Links to Apprentices |
| Status | `fldWvTbMZhWOca2SG` | singleSelect | Review status |
| Record created | `fldXXYEDZttMcvCSJ` | createdTime | Creation date |
| Feedback Completed | `fldReEs9Fu8L7t09n` | createdTime | Completion timestamp |
| Cohort | `fldoRplqNk1njSYmn` | multipleLookupValues | Cohort lookup |
| Name (from Apprentice) | `fldzrU9YuPQTK5M9O` | multipleLookupValues | Apprentice name |
| Apprentice status | `fldyWS3a6Y0sSeDaK` | multipleLookupValues | Current status |
| Portfolio status | `fldHunyqYk5OMHpJ7` | singleSelect | Portfolio progress |
| Portfolio on track? | `fldXrFMpDogQwrtNA` | formula | On track indicator |
| Ready for EPA? | `fld2n9dla7IxCgbw2` | singleSelect | EPA readiness |
| EPA aim | `fldlcRzo1YywzCNRW` | date | Target EPA date |
| Training | `fldm2qCJyrwIB7yyp` | rating | Training rating |
| Portfolio | `fldZdhaoPdt3qn3OU` | rating | Portfolio rating |
| EPA readiness | `fldFqhRbnH73qhi7D` | rating | EPA readiness rating |
| Support or guidance | `fld1lULeOmWO3Q5cP` | multilineText | Support requests |
| Follow up? | `fldb05Uljc3TuPddm` | singleSelect | Follow up needed |
| Follow up date: | `fldLLbre3ry2gxDia` | date | Chase date |
| Follow up actions | `fldZh2tGrh7sioNQ0` | multilineText | Action items |
| FAC Review notes | `fldg3rYvSm9N0f5nd` | multilineText | Staff notes |

---

## Progress Reviews (Employer Feedback)

**Table ID:** `tblwdSYGgGMXJ1DX7`

Employer responses to quarterly reviews.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Name | `fld5F6KqHAMsxFFzu` | singleLineText | Record name |
| Apprentice record | `fld82TAzyQKsTDQUg` | multipleRecordLinks | Links to Apprentices |
| Apprentice | `fldmd7geZn1bHCUDb` | singleLineText | Apprentice name |
| Date responded | `fldkrwOSS5HZO1oG9` | createdTime | When employer submitted |
| Review date | `fldlpeGaL5lUVlfyI` | date | Review period |
| Created | `fldbsseuN8cN6uWp4` | createdTime | Record creation |
| Collected | `fldzNCxDQAlycUhQX` | singleSelect | Collection status |
| Company name | `fld5cudklmHyLwCH8` | multipleRecordLinks | Employer |
| Line manager name | `fldT0Hn34DKaGvmzE` | multipleLookupValues | LM name |
| Line manager email | `fld9MyE6TdJpzZltp` | multipleLookupValues | LM email |
| Concerns | `fldSCa1If1XACNKKQ` | singleSelect | Has concerns flag |
| Concern details | `fldwFzbURRCbnONUe` | multilineText | Details if flagged |
| Apprentice productivity | `fldjICIu7Zl5fRoWd` | rating | Performance rating |
| Apprentice strengths? | `fld1jpTrXaBZvY3O5` | multilineText | Strengths feedback |
| Apprentice areas for dev? | `fldEGNuJBruwDJN9X` | multilineText | Development areas |
| Apprentice Status | `fldDV2e0zIwZ4v3JB` | multipleLookupValues | Current status |

---

## Support log

**Table ID:** `tblWINmz4JDtVUucD`

Intervention and support request tracking.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Id | `fldJEkZf9WEXVcCgx` | autoNumber | Record ID |
| Learner | `fldZ1DyPBYaSfvthN` | multipleRecordLinks | Links to All learners |
| Status | `fld4VdyaaQh6LfCOV` | singleSelect | Open/In Progress/Closed |
| Support request | `fldNQgMDGA0YP9EMA` | multilineText | Request details |
| Assignee | `fld9EvhuECX4tyEXm` | singleCollaborator | FAC staff assigned |
| Raised by | `fldLUAM3kXorg8w1y` | singleSelect | Who raised it |
| Notes | `fldYFMO1xmTeCYE79` | multilineText | Additional notes |
| Action taken | `fld0pnmUbLFywcslu` | multilineText | Resolution notes |
| Next follow up | `fldERf46byrdnwzjd` | date | Chase date (for alerts) |
| Closed | `fldk4t41qb03T8XHr` | date | Resolution date |
| Created | `fld2Uqadq6Jw5MQUs` | createdTime | Request date |
| Modified | `fldN9Z4AwLAefliYM` | lastModifiedTime | Last update |

---

## Staff - Apprentice Pulse

**Table ID:** `tblJjn62ExE1LVjmx`

Staff members for authentication. Uses Airtable collaborators for email lookup.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Id | `fldbTKP32s3Soev91` | autoNumber | Record ID |
| Staff Name | `fldHEHhQInmSdipn8` | singleCollaborator | Collaborator with id, email, name |

---

## Cohorts

**Table ID:** `tbllAnSw8VPYFAa1a`

Cohort reference for filtering and grouping.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Number | `fldqWsDL2oqnonvZg` | singleLineText | Cohort name (e.g. "29") |
| FAC Cohort | `fldc32RUV5J8kPK7I` | singleSelect | FAC cohort identifier |
| Start date | `fldvkgtr4XlLV3Uff` | date | Cohort start |
| Planned end date | `fldRgWeIylBmT3xkh` | formula | Expected end |
| Length | `fldgBuUTMrPZ1TpCW` | singleSelect | Programme length |
| Start year | `fldJSDsO4yILnvvMj` | singleSelect | Start year |
| Apprentices | `fldF2zEQCRaWglKl0` | multipleRecordLinks | Links to Apprentices |
| Planned hours | `fldnjvEkFizWKyAOs` | number | Expected OTJ hours |

---

## Events - Apprentice Pulse

**Table ID:** `tblkbskw4fuTq0E9p`

Scheduled events/sessions for attendance tracking.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Name | `fldMCZijN6TJeUdFR` | singleLineText | Event name |
| FAC Cohort | `fldcXDEDkeHvWTnxE` | multipleRecordLinks | Links to Cohorts |
| Date Time | `fld8AkM3EanzZa5QX` | dateTime | Event start date and time |
| Event Type | `fldo7fwAsFhkA1icC` | singleSelect | Regular class, Workshop, Hackathon |
| Survey | `fld9XBHnCWBtZiZah` | url | Optional survey form URL |
| Attendance | `fldcPf53fVfStFZsa` | multipleRecordLinks | Linked attendance records |
| Name - Date | `fld7POykodV0LGsg1` | formula | Display name with date |
| Public | `fldatQzdAo8evWlNc` | checkbox | Visible on public check-in page |
| Check-in Code | `fldKMWSFmYONkvYMK` | number | 4-digit code for external attendees |

---

## Learner Touchpoint Log

**Table ID:** `tbl2O3QcYpss1SaP4`

Staff interaction tracking with learners.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Id | `fldQtuOmycArXgzSJ` | formula | Record ID |
| Learner | `fldhGxNFdhnNh733l` | multipleRecordLinks | Links to Apprentices |
| Staff Member/s | `fldC9hpSkvDl3RPFe` | multipleCollaborators | Staff involved |
| Date of Interaction | `fldxTmAl39f5JHeND` | date | When |
| Type of Interaction | `fld0SUM3vuE7bxRrD` | singleSelect | Call/Email/Meeting |
| Purpose / Summary | `fldahohBtf4fxwGi1` | multilineText | What was discussed |
| Further Follow-up? | `fldq566vb281Quga4` | singleSelect | Needs follow up |
| Follow-up Actions | `fldtjQtXb3datImSf` | multilineText | Action items |
| Next Follow-up Date | `fld7bIkCXtZRKA38K` | date | Chase date |
| Learner Status | `fldr5SlO9nHXEzULe` | multipleLookupValues | Current status |

---

## All learners

**Table ID:** `tblSrNwOVNWAwtcAU`

Extended learner record with ILR and Skills Bootcamp data. Use Apprentices table for primary lookups; this table for intervention fields.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Learner Name | `fldmb6uW5XYPpTXZK` | formula | Display name |
| Learner Email | `fldB7drUuq6gUgWai` | singleLineText | Email address |
| Apprentice record | `fldGdpqMgcwIZslly` | multipleRecordLinks | Links to Apprentices |
| Areas of concern | `fldYMkFhVHZZL5FOT` | multipleSelects | Risk flags |
| Intervention | `fldpWRGMKIH5Jq6kk` | multipleSelects | Intervention actions |
| Concerns status | `fldYl3ol1wQCNsyvq` | multipleSelects | Status of concerns |
| Attendance | `fldHL8kAX3eTUkOOq` | multipleRecordLinks | Attendance records |
| Attendance (%) | `fldRqJ9ZnhdUXbXTb` | percent | Attendance percentage |

---

## Terms - Apprentice Pulse

**Table ID:** `tbl4gkcG92Bc8gFU7`

Term intervals for filtering and organizing data by academic periods.

| Field | ID | Type | Purpose |
|-------|-----|------|---------|
| Name | `fldrnRBnBuHbscSy7` | singleLineText | Term name (e.g. "Term 1 2024", "Summer 2024") |
| Starting Date | `fldlzwlqYo7rMMSDp` | date | Term start date |
| End Date | `fldJKhrzNZNCD6SYY` | date | Term end date |

---

## Alert Triggers

Fields that trigger early intervention alerts:

| Alert Type | Table | Field | Field ID | Condition |
|------------|-------|-------|----------|-----------|
| Support requested | Weekly learning log | Support Request | `fld3bvkUutoLVBIFH` | Not empty |
| Overdue support | Support log | Next follow up | `fldERf46byrdnwzjd` | Past date + Status != Closed |
| Review follow up | Progress Reviews (Apprentices) | Follow up date: | `fldLLbre3ry2gxDia` | Past date + Follow up? = Yes |
| Employer concern | Progress Reviews (Employer Feedback) | Concerns | `fldSCa1If1XACNKKQ` | = "Yes" |
| Low attendance | All learners | Attendance (%) | `fldRqJ9ZnhdUXbXTb` | Below threshold |
| Portfolio at risk | Progress Reviews (Apprentices) | Portfolio on track? | `fldXrFMpDogQwrtNA` | = false |