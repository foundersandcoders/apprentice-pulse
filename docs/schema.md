# Airtable Schema

Schema mapping for Apprentice Pulse. Only includes tables and fields relevant to attendance tracking, progress reviews, OTJ monitoring, and early intervention alerts.

## Relationships Overview

```
Apprentices (primary learner record)
  ├── Attendance (Current) → check-in records
  ├── Weekly learning log → OTJ hours, support flags
  ├── Progress Reviews (Apprentices) → quarterly reviews
  ├── Support log → intervention tracking
  └── Cohort # → cohort grouping

Progress Reviews (Employer Feedback)
  └── Apprentice record → links to Apprentices

Weekly surveys (Learner Feedback base)
  └── Cohort → links to Cohorts
```

---

## Learners Base

### Apprentices

Primary learner record. Use this as the source of truth for learner identity.

| Field | Type | Purpose |
|-------|------|---------|
| Name | formula | Display name |
| Cohort # | multipleRecordLinks | Links to cohort |
| Learner status | singleSelect | Active/Withdrawn/Completed |
| Learner email | multipleLookupValues | Personal email |
| work-email | email | Work email for comms |
| Start date | multipleLookupValues | Programme start |
| Planned end date | multipleLookupValues | Expected EPA date |
| Line manager email | email | For employer comms |
| Grade | singleSelect | Current grade |
| Areas of concern | multipleSelects | Risk flags |
| Progress reviews | multipleRecordLinks | Links to review records |

### Attendance (Current)

Check-in records for events/sessions.

| Field | Type | Purpose |
|-------|------|---------|
| Name | formula | Auto-generated ID |
| Date | date | Event date |
| Time | singleLineText | Check-in time |
| Learner | multipleRecordLinks | Links to All learners |
| Apprentice | multipleRecordLinks | Links to Apprentices |
| Cohort | singleSelect | Cohort filter |
| Event | singleLineText | Event name |

### Weekly learning log

OTJ hours tracking and support request flags.

| Field | Type | Purpose |
|-------|------|---------|
| Id | autoNumber | Record ID |
| Apprentice | multipleRecordLinks | Links to Apprentices |
| Created | createdTime | Submission date |
| Status | singleSelect | Review status |
| Total Hours | formula | Classroom + Self-directed |
| Classroom | number | OTJ classroom hours |
| Self-directed | number | OTJ self-study hours |
| Week | formula | Week number |
| Support Request | singleSelect | Support flag (triggers alert) |
| Blockers | multilineText | Issues reported |

### Progress Reviews (Apprentices)

Quarterly review records completed by apprentices.

| Field | Type | Purpose |
|-------|------|---------|
| Apprentice | multipleRecordLinks | Links to Apprentices |
| Status | singleSelect | Review status |
| Review date | date | Scheduled date |
| OTJ Hours | number | Actual hours logged |
| OTJ hours expected | number | Target hours |
| OTJ status | formula | On track/Behind |
| Portfolio completion % | percent | EPA readiness |
| KSBs Focused On | multipleSelects | Current focus areas |
| Employer feedback | checkbox | Employer response received |

### Progress Reviews (Employer Feedback)

Employer responses to quarterly reviews.

| Field | Type | Purpose |
|-------|------|---------|
| Apprentice record | multipleRecordLinks | Links to Apprentices |
| Review date | date | Review period |
| Date responded | createdTime | When employer submitted |
| Collected | singleSelect | Collection status |
| Concerns | singleSelect | Has concerns flag |
| Concern details | multilineText | Details if flagged |
| Apprentice productivity | rating | Performance rating |

### Support log

Intervention and support request tracking.

| Field | Type | Purpose |
|-------|------|---------|
| Id | autoNumber | Record ID |
| Learner | multipleRecordLinks | Links to All learners |
| Status | singleSelect | Open/In Progress/Closed |
| Support request | multilineText | Request details |
| Assignee | singleCollaborator | FAC staff assigned |
| Next follow up | date | Chase date (for alerts) |
| Action taken | multilineText | Resolution notes |
| Closed | date | Resolution date |
| Created | createdTime | Request date |

---

## Learner Feedback Base

### Cohorts

Cohort reference for filtering and survey distribution.

| Field | Type | Purpose |
|-------|------|---------|
| Name | singleLineText | Cohort name (e.g. "FAC29") |
| Current | checkbox | Active cohort flag |
| Weekly Survey (Apprenticeship) | singleLineText | Survey form URL |
| Weekly surveys | multipleRecordLinks | Links to responses |

### Weekly surveys

Weekly feedback responses from apprentices.

| Field | Type | Purpose |
|-------|------|---------|
| Id | autoNumber | Record ID |
| Created By | createdBy | Respondent |
| Created | createdTime | Submission time |
| Learning? | singleSelect | Self-assessment rating |
| Collaboration? | singleSelect | Team rating |
| Cohort | multipleRecordLinks | Links to Cohorts |
| Week | formula | Week number |

---

## Alert Triggers

Fields that trigger early intervention alerts:

| Alert Type | Table | Field | Condition |
|------------|-------|-------|-----------|
| Low attendance | Attendance (Current) | Missing records | No check-in for scheduled event |
| Support requested | Weekly learning log | Support Request | Not null/empty |
| Low OTJ hours | Progress Reviews (Apprentices) | OTJ status | "Behind" |
| Overdue support | Support log | Next follow up | Past date + Status != Closed |
| Missing survey | Weekly surveys | Created | No record for current week |
| Employer concern | Progress Reviews (Employer Feedback) | Concerns | "Yes" |