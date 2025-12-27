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
| `/api/auth/staff/login` | Send magic link email to staff |
| `/api/auth/student/login` | Send magic link email to students |
| `/api/auth/verify` | Verify magic link token, create session |
| `/api/auth/logout` | Clear session cookie |
| `/api/checkin` | Record attendance to Airtable |
| `/api/events` | Fetch today's events |
| `/api/webhooks/airtable` | Receive Airtable automation triggers |

### Pages

| Route | Purpose | Access |
|-------|---------|--------|
| `/` | Home page | Public |
| `/login` | Student login | Public (redirects if authenticated) |
| `/admin/login` | Staff login | Public (redirects if authenticated) |
| `/admin` | Admin dashboard | Staff only |
| `/checkin` | Student check-in | Authenticated users |

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

### Decisions & Rationale

**SvelteKit over Next.js**
Lighter framework with less boilerplate. Handles both frontend (PWA for student check-in) and API routes in one codebase. Native Vercel deployment support.

**TypeScript**
Type safety helps when working with Airtable data structures. Catches errors at build time.

**Vitest over Jest**
Faster, native ES modules support, works well with SvelteKit out of the box.

**Magic link auth**
No password management. Separate login flows for staff (`/admin/login`) and students (`/login`). JWT tokens with 15-minute expiry sent via email. Session stored as HTTP-only cookie for 90 days. Minimal friction for daily check-ins.

**Airtable as database**
Already in use at FAC. No migration needed. System acts as automation layer on top of existing data.

**Resend for email**
Simple API, good free tier, reliable delivery. Handles magic links and reminder emails.

**Discord webhooks**
Staff already use Discord. Webhooks require no bot setup - just POST to a URL. Instant notifications for support requests and alerts.

**Vercel (temporary) → Heroku (production)**
Vercel for rapid iteration during development. Will migrate to Heroku when production permissions available. Config via environment variables ensures portability.

**Vercel Cron for scheduled jobs**
Built into Vercel, no external scheduler needed. Runs API routes on schedule for attendance chases, survey sends, reminders.

## Environment Variables

```
AIRTABLE_API_KEY=       # Airtable personal access token
AIRTABLE_BASE_ID=       # Airtable base ID
RESEND_API_KEY=         # Resend API key for emails
RESEND_FROM_EMAIL=      # Sender email (e.g., "App Name <noreply@domain.com>")
DISCORD_WEBHOOK_URL=    # Discord webhook for notifications
AUTH_SECRET=            # Secret for JWT signing (min 32 chars)
```