# AP-30 External staff access management via email and name

> Enable staff to grant external people **login access** to view Airtable attendance data by simply adding their email and name to existing attendance access fields, without requiring them to be registered apprentices or staff members.

## Current Status

✅ **Already implemented:**
- External check-in system for public events (`/api/checkin/external`) - **separate feature, not related**
- Airtable schema fields: `Attendace access` (email) and `Name - Attendance access` (text)

❌ **Missing functionality:**
- **Login authentication** for external staff members via magic link
- External user type in JWT tokens and route protection
- UI adaptation for external staff viewing attendance data (read-only access)

## Tasks

1. [✅] **Extend Airtable Configuration**
   - [✅] 1.1 Add external access field constants to `src/lib/airtable/config.ts`
   - [✅] 1.2 Update staff fields interface to include external access fields

2. [✅] **Create External Access Service**
   - [✅] 2.1 Create `src/lib/airtable/external-access.ts` service module
   - [✅] 2.2 Implement `getExternalAccessByEmail()` function
   - [✅] 2.3 Implement `listExternalAccessUsers()` function for management
   - [ ] 2.4 Add unit tests for external access service functions

3. [✅] **Extend Authentication System**
   - [✅] 3.1 Add `'external'` user type to `src/lib/server/auth.ts`
   - [✅] 3.2 Update JWT token payload interface to support external users
   - [✅] 3.3 Update `generateMagicToken()` to handle external user type
   - [✅] 3.4 Update `verifyMagicToken()` to handle external user type

4. [✅] **Update Login Flow for External Staff**
   - [✅] 4.1 Extend login API to check external access fields alongside staff/student tables
   - [✅] 4.2 Update `src/routes/api/auth/login/+server.ts` to lookup external users
   - [✅] 4.3 Send magic links with external user type when found in attendance access
   - [ ] 4.4 Test login flow handles external staff seamlessly

5. [✅] **Update Route Protection**
   - [✅] 5.1 Extend user type definitions in `src/hooks.server.ts`
   - [✅] 5.2 Add external user route permissions (read-only attendance access)
   - [✅] 5.3 Block external users from event management and admin functions
   - [✅] 5.4 Allow external users on `/admin/attendance/*` routes (read-only)

6. [✅] **Update User Interface for External Staff**
   - [✅] 6.1 Update navigation components to handle external user type
   - [✅] 6.2 Add external staff indicator in UI (role badge/status)
   - [✅] 6.3 Ensure external staff see read-only attendance views
   - [✅] 6.4 Hide inaccessible features for external staff (event management, etc.)

7. [✅] **Testing and Validation**
   - [✅] 7.1 Add unit tests for external access service functions
   - [✅] 7.2 Run linter and fix all code quality issues
   - [ ] 7.3 Add end-to-end tests for external staff login flow
   - [ ] 7.4 Test external staff cannot escalate privileges or modify data

## Notes

### Field IDs from Airtable Schema
- `Attendace access` field: `fldsR6gvnOsSEhfh9` (email)
- `Name - Attendance access` field: `fld5Z9dl265e22TPQ` (singleLineText)
- Staff table: `tblJjn62ExE1LVjmx`

### Implementation Strategy
- **Focus**: Login authentication for external staff members only
- Build on existing magic link authentication pattern
- No breaking changes to existing staff/student flows
- External staff get limited, read-only access to attendance data
- **Not related** to existing external check-in functionality

### User Type Hierarchy
```typescript
type UserType = 'staff' | 'student' | 'external';

// Route access levels:
// staff: full admin access
// student: check-in only
// external: read-only attendance viewing only
```

### Security Considerations
- External staff cannot modify any data
- External staff cannot access event management
- External staff cannot see other admin functions
- Authentication still requires magic link (secure)
- External staff only get attendance viewing permissionsbtw