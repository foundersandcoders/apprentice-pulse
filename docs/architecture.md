# Apprentice Pulse - Architecture

## Overview

Apprentice Pulse is an automation and monitoring layer that sits on top of existing Airtable bases. It automates attendance tracking, progress review workflows, and early intervention alerts for at-risk learners.

## System Diagram

```mermaid
flowchart TB
    subgraph App["SvelteKit App"]
        Frontend["Frontend (PWA)<br/>- Check-in<br/>- QR/NFC"]
        API["API Routes<br/>- /api/auth<br/>- /api/checkin<br/>- /api/webhooks"]
        Cron["Cron Jobs<br/>- Attendance chase<br/>- Survey reminders<br/>- EPA alerts"]
    end

    subgraph External["External Services"]
        Airtable[(Airtable<br/>Data)]
        Resend[Resend<br/>Email]
        Discord[Discord<br/>Webhooks]
    end

    Frontend --> API
    API --> Airtable
    API --> Resend
    API --> Discord
    Cron --> Airtable
    Cron --> Resend
    Cron --> Discord
    Airtable -->|Automation trigger| API
```

## Components

### Frontend (PWA)

Mobile-first web app for student attendance check-in.

**Check-in flow:**
1. Student taps NFC sticker or scans QR code → opens app
2. First visit: enter email → magic link → session stored (90 days)
3. Subsequent visits: tap → check in → done (single action)

**Event detection:**
- App fetches today's events from Airtable
- Filters to events within ±1 hour of current time
- Single event: one-tap check-in
- Multiple events: show list to select
- No events: display "No session right now"

### API Routes

Server-side endpoints handling:

| Route | Purpose |
|-------|---------|
| `/api/auth/send-link` | Send magic link email |
| `/api/auth/verify` | Verify magic link token, create session |
| `/api/checkin` | Record attendance to Airtable |
| `/api/events` | Fetch today's events |
| `/api/webhooks/airtable` | Receive Airtable automation triggers |

### Cron Jobs

Scheduled tasks running on Vercel Cron:

| Schedule | Job | Action |
|----------|-----|--------|
| Every 15 min | Attendance chase | Email students not checked in 1hr after event start |
| Every 15 min | Event survey send | Send survey to attendees 5hrs after event start |
| Every 15 min | Scheduled survey send | Send recurring surveys at configured time (e.g., Tues 10am) |
| Every 15 min | Survey reminder | Chase non-completers X hours after survey sent |
| Daily 9am | Support follow-up | Alert if support request not actioned within timeframe |
| Weekly | EPA timeline check | Flag learners at risk of missing EPA deadlines |

## External Services

### Airtable (Database)

Existing bases:
- Attendance (Current)
- Weekly Learning Log
- Progress reviews
- Events/Sessions

New/updated tables for surveys:

| Table | Purpose |
|-------|---------|
| Scheduled Surveys | Recurring surveys config (day, time, form URL, cohort) |
| Events | Add column: survey form URL (select: none or form) |
| Survey Sends | Log: student email, survey, sent_at, completed_at |

Survey completion is tracked by matching email from Airtable form responses against Survey Sends.

The app reads and writes via Airtable REST API. Airtable remains the source of truth.

### Resend (Email)

Transactional email for:
- Magic link authentication
- Attendance reminders
- Survey chase-ups
- Support request notifications

### Discord (Notifications)

Webhook integration for real-time staff alerts:
- Student requests support
- Low attendance warnings
- EPA timeline alerts

## Data Flow

### Attendance Check-in

```mermaid
sequenceDiagram
    participant S as Student
    participant App as SvelteKit App
    participant AT as Airtable

    S->>App: Tap NFC / Scan QR
    App->>App: Validate session
    App->>AT: Fetch today's events
    AT-->>App: Events list
    App-->>S: Show check-in button
    S->>App: Tap check-in
    App->>AT: Write attendance record
    AT-->>App: Confirmed
    App-->>S: "You're checked in ✓"
```

### Attendance Chase

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant AT as Airtable
    participant R as Resend

    Cron->>AT: Fetch events (start + 1hr < now)
    AT-->>Cron: Events list
    Cron->>AT: Fetch attendance records
    AT-->>Cron: Attendance list
    Cron->>Cron: Find missing students
    Cron->>R: Send chase emails
    Cron->>AT: Log chase sent
```

### Support Request Alert

```mermaid
sequenceDiagram
    participant S as Student
    participant AT as Airtable
    participant App as SvelteKit App
    participant D as Discord

    S->>AT: Submit survey (support=true)
    AT->>App: Automation webhook
    App->>D: POST notification
    D-->>D: Message in channel
```

### Event Survey Send

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant AT as Airtable
    participant R as Resend

    Cron->>AT: Fetch events (start + 5hr < now)
    AT-->>Cron: Events with surveys
    Cron->>AT: Fetch attendance for those events
    AT-->>Cron: Attendees list
    Cron->>AT: Check Survey Sends (already sent?)
    Cron->>R: Send survey email to new attendees
    Cron->>AT: Log to Survey Sends
```

### Survey Reminder

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant AT as Airtable
    participant R as Resend

    Cron->>AT: Fetch Survey Sends (sent > X hrs ago, not completed)
    AT-->>Cron: Pending surveys
    Cron->>AT: Check form responses (by email)
    AT-->>Cron: Completions
    Cron->>Cron: Filter non-completers
    Cron->>R: Send reminder email
    Cron->>AT: Update reminder_sent_at
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | SvelteKit |
| Language | TypeScript |
| Testing | Vitest |
| Auth | Magic link (custom) |
| Database | Airtable |
| Email | Resend |
| Notifications | Discord webhooks |
| Hosting (temp) | Vercel |
| Hosting (prod) | Heroku |
| Scheduled jobs | Vercel Cron |

## Environment Variables

```
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
RESEND_API_KEY=
DISCORD_WEBHOOK_URL=
MAGIC_LINK_SECRET=
SESSION_SECRET=
```