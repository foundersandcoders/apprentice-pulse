# User Stories

Requirements for Apprentice Pulse, derived from project proposal acceptance criteria.

## Roles

| Role | Description |
|------|-------------|
| Apprentice | Learner enrolled in FAC apprenticeship programme |
| FAC Staff | Founders and Coders team member (admin, facilitator) |
| Line Manager | Employer contact responsible for apprentice |

---

## Epic 1: Attendance Management

### US-1: Event management
**As** FAC staff  
**I want to** create, modify, and delete events via a calendar interface  
**So that** I can manage the training schedule and enable attendance tracking

**Acceptance Criteria:**
- Calendar view displays existing events from Airtable
- Create event: select date, cohort, and event type (regular class, workshop, hackathon)
- Edit event: update date, cohort, or event type
- Delete event: remove event from Airtable
- Event syncs to Attendance (Current) table
- Event type stored for filtering and reporting

---

### US-2: Check-in to event
**As an** apprentice  
**I want to** register my attendance by tapping an NFC sticker or scanning a QR code  
**So that** I can check in quickly without manual roll calls

**Acceptance Criteria:**
- Apprentice taps NFC or scans QR → app opens
- If no session: enter email → receive magic link → session stored (90 days)
- If session exists: single tap to check in
- Attendance record written to Airtable
- Confirmation message displayed

---

### US-3: Attendance chase email
**As** FAC staff  
**I want** students who haven't checked in to receive an automatic reminder  
**So that** I don't have to manually chase attendance

**Acceptance Criteria:**
- System checks attendance 1 hour after event start
- Students without check-in record receive email
- Email includes event name and check-in link
- Chase is logged to prevent duplicate sends

---

### US-4: Staff attendance notification
**As** FAC staff  
**I want to** receive a notification when attendance is low or missing  
**So that** I can follow up with students who may need support

**Acceptance Criteria:**
- Discord notification sent to staff channel
- Includes event name, expected vs actual attendance count
- Lists students who haven't checked in

---

## Epic 2: Survey Automation

### US-5: Event survey distribution
**As** FAC staff  
**I want** surveys to be automatically sent to attendees after an event  
**So that** I don't have to manually distribute feedback forms

**Acceptance Criteria:**
- Survey sent 5 hours after event start time
- Only sent to students who checked in
- Survey form URL configured per event in Airtable
- Send logged in Survey Sends table

---

### US-6: Scheduled recurring surveys
**As** FAC staff  
**I want to** configure recurring surveys (e.g., weekly on Tuesday 10am)  
**So that** regular feedback collection happens automatically

**Acceptance Criteria:**
- Scheduled Surveys table stores: cohort, day, time, form URL
- System sends survey at configured time to active cohort members
- Send logged in Survey Sends table

---

### US-7: Survey reminder
**As** FAC staff  
**I want** non-completers to receive automatic reminders  
**So that** survey completion rates improve without manual chasing

**Acceptance Criteria:**
- System checks Survey Sends for incomplete surveys
- Reminder sent X hours after initial send (configurable)
- Completion detected by matching email in form responses
- Reminder logged to prevent duplicates

---

### US-8: Support request alert
**As** FAC staff  
**I want to** be immediately notified when a student requests support in a survey  
**So that** I can respond quickly to learners who need help

**Acceptance Criteria:**
- Airtable automation triggers webhook when support field = true
- Discord notification sent to staff channel
- Includes student name, survey type, and support details
- Support log record created in Airtable

---

### US-9: Support follow-up alert
**As** FAC staff  
**I want to** receive an alert if a support request hasn't been actioned  
**So that** no student falls through the cracks

**Acceptance Criteria:**
- Daily check of Support log table
- Alert triggered if Status != Closed AND Next follow up < today
- Discord notification to assigned staff member
- Includes days overdue and original request details

---

## Epic 3: Progress Monitoring

### US-10: Low OTJ hours alert
**As** FAC staff  
**I want to** be alerted when an apprentice's OTJ hours fall behind  
**So that** I can intervene before they miss EPA requirements

**Acceptance Criteria:**
- System compares actual vs expected OTJ hours from Progress Reviews
- Alert triggered when OTJ status = "Behind"
- Discord notification includes: student name, hours logged, hours expected, shortfall

---

### US-11: EPA timeline alert
**As** FAC staff  
**I want to** be alerted when apprentices are at risk of missing EPA deadlines  
**So that** I can provide additional support or adjust timelines

**Acceptance Criteria:**
- Weekly check of Planned end date vs current progress
- Alert triggered when portfolio completion < threshold for time remaining
- Discord notification includes: student name, planned end date, portfolio %

---

### US-12: Missing employer feedback alert
**As** FAC staff  
**I want to** know when employer feedback is overdue for a progress review  
**So that** I can chase line managers and complete the review cycle

**Acceptance Criteria:**
- Check Progress Reviews where Employer feedback = false
- Alert triggered if Review date + X days has passed
- Discord notification includes: student name, employer, review date

---

## Epic 4: Stretch Goals

### US-13: Discord notifications
**As** FAC staff  
**I want** alerts to be sent via Discord  
**So that** notifications integrate with our existing communication workflow

**Acceptance Criteria:**
- All alerts configurable to send to Discord webhook
- Message formatting includes relevant context
- Link to Airtable record where applicable

**Status:** In scope (implemented as primary notification channel)

---

### US-14: Admin dashboard
**As** FAC staff  
**I want** a dashboard showing attendance records, support history, and learner status  
**So that** I can view the holistic picture of a learner's journey

**Acceptance Criteria:**
- View attendance history per student
- View support requests and resolution status
- View OTJ hours progress
- Filter by cohort

**Status:** Stretch goal (future sprint)

---

### US-15: Cohort dashboard
**As** FAC staff  
**I want** a cohort-level view of progress metrics  
**So that** I can identify trends and at-risk groups

**Acceptance Criteria:**
- Aggregate attendance rate per cohort
- Average OTJ hours per cohort
- Support request count per cohort
- Visual indicators for cohorts needing attention

**Status:** Stretch goal (future sprint)

---

### US-16: Quarterly review automation
**As** FAC staff  
**I want** the quarterly progress review process to be automated  
**So that** survey distribution, chasing, and summary generation happen without manual effort

**Acceptance Criteria:**
- Automatic distribution of apprentice review survey
- Automatic distribution of employer feedback survey
- Chase reminders for non-completion
- Alert when both parties have completed

**Status:** Stretch goal (future sprint)

---

## Priority Matrix

| Priority | User Stories | Rationale |
|----------|--------------|-----------|
| P0 - MVP | US-1, US-2, US-3, US-5, US-7, US-8 | Event management + core attendance + survey automation |
| P1 - Essential | US-4, US-6, US-9, US-10 | Staff notifications + monitoring |
| P2 - Important | US-11, US-12, US-13 | Progress tracking alerts |
| P3 - Stretch | US-14, US-15, US-16 | Dashboards + advanced automation |