# Plan: Consolidate Login & Fix Navigation

## Overview

Merge staff and student login into a single `/login` page and fix the navigation structure so each user type has a clear flow.

## Current State (Problems)

1. **Two login pages**: `/login` (students) and `/admin/login` (staff)
2. **Useless home page**: `/` just shows "logged in as X" with logout link
3. **Confusing nav**: Admin dashboard has "Back to Home" but `/` is pointless for staff
4. **Broken student flow**: Students land on `/` after login, must manually find `/checkin`
5. **No nav on checkin**: No way to logout or navigate elsewhere

## Desired State

| User Type | Login | Landing | Primary View |
|-----------|-------|---------|--------------|
| Student | `/login` | `/checkin` | `/checkin` |
| Staff | `/login` | `/admin` | `/admin/*` |

**Single login flow:**
1. User enters email at `/login`
2. Backend checks Staff table first, then Apprentices table
3. Magic link sent with user type encoded
4. After verification, redirect based on type

---

## Implementation Steps

### Step 1: Consolidate Login API

**File:** `src/routes/api/auth/login/+server.ts` (new unified endpoint)

Create a single login endpoint that:
1. Checks Staff table first (by collaborator email)
2. If not found, checks Apprentices table (by learner email)
3. Returns appropriate user type in token

```typescript
export async function POST({ request }) {
  const { email } = await request.json();

  // Try staff first (higher privilege)
  const staff = await getStaffByEmail(email);
  if (staff) {
    const token = await generateToken({ email, type: 'staff' });
    await sendMagicLink(email, token);
    return json({ success: true });
  }

  // Try apprentice
  const apprentice = await getApprenticeByEmail(email);
  if (apprentice) {
    const token = await generateToken({ email, type: 'student' });
    await sendMagicLink(email, token);
    return json({ success: true });
  }

  return json({ success: false, error: 'Email not found' }, { status: 404 });
}
```

### Step 2: Update Verify Endpoint Redirect

**File:** `src/routes/api/auth/verify/+server.ts`

Update redirect after verification:
```typescript
// After setting session cookie
if (user.type === 'staff') {
  redirect(303, '/admin');
} else {
  redirect(303, '/checkin');
}
```

### Step 3: Update Login Page

**File:** `src/routes/login/+page.svelte`

- Remove any student-specific wording
- Make it generic: "Enter your email to sign in"
- Update form to POST to `/api/auth/login`

### Step 4: Delete `/admin/login` Route

Delete the entire `src/routes/admin/login/` folder. No redirects needed - we're building from scratch.

### Step 5: Update Home Page Redirect

**File:** `src/routes/+page.server.ts`

Redirect authenticated users to their landing page:
```typescript
export function load({ locals }) {
  if (locals.user) {
    if (locals.user.type === 'staff') {
      redirect(303, '/admin');
    } else {
      redirect(303, '/checkin');
    }
  }
  // Unauthenticated: show login options or redirect to /login
  redirect(303, '/login');
}
```

### Step 6: Update Auth Routes in Hooks

**File:** `src/hooks.server.ts`

Simplify AUTH_ROUTES since there's only one login page now:
```typescript
const AUTH_ROUTES = ['/login'];
```

### Step 7: Fix Admin Dashboard Navigation

**File:** `src/routes/admin/+page.svelte`

Replace "Back to Home" with a proper header:
```svelte
<header class="mb-6 flex justify-between items-start">
  <div>
    <h1 class="text-2xl font-bold">Admin Dashboard</h1>
    <p class="text-gray-600 mt-1">Welcome, {data.user?.email}</p>
  </div>
  <a href={resolve('/api/auth/logout')} class="text-sm text-gray-500 hover:text-gray-700">
    Logout
  </a>
</header>
```

### Step 8: Add Navigation to Checkin Page

**File:** `src/routes/checkin/+page.svelte`

Add header with logout (and admin link for staff):
```svelte
<header class="p-4 flex justify-between items-center border-b">
  <h1 class="font-semibold">Check In</h1>
  <div class="flex gap-4 text-sm">
    {#if data.user?.type === 'staff'}
      <a href={resolve('/admin')} class="text-blue-600 hover:underline">Admin</a>
    {/if}
    <a href={resolve('/api/auth/logout')} class="text-gray-500 hover:text-gray-700">Logout</a>
  </div>
</header>
```

### Step 9: Clean Up Old Routes

Delete these folders:
- `src/routes/api/auth/staff/`
- `src/routes/api/auth/student/`
- `src/routes/admin/login/`

### Step 10: Update README

**File:** `README.md`

Update authentication section to reflect single login:
- Remove separate login page references
- Update route table
- Simplify flow diagram

---

## Files to Modify

| File | Change |
|------|--------|
| `src/routes/api/auth/login/+server.ts` | New unified login endpoint |
| `src/routes/api/auth/verify/+server.ts` | Update redirect logic |
| `src/routes/login/+page.svelte` | Make generic, update API call |
| `src/routes/+page.svelte` | Remove content |
| `src/routes/+page.server.ts` | Add redirect logic |
| `src/hooks.server.ts` | Simplify AUTH_ROUTES |
| `src/routes/admin/+page.svelte` | Replace "Back to Home" with logout |
| `src/routes/checkin/+page.svelte` | Add header with nav |
| `README.md` | Update auth documentation |

## Files to Delete

| File | Reason |
|------|--------|
| `src/routes/api/auth/staff/` | Replaced by unified endpoint |
| `src/routes/api/auth/student/` | Replaced by unified endpoint |
| `src/routes/admin/login/` | Single login at `/login` |

---

## Testing

1. **Staff login**: Enter staff email → lands on `/admin`
2. **Student login**: Enter student email → lands on `/checkin`
3. **Unknown email**: Shows error "Email not found"
4. **Already logged in**: Visiting `/login` redirects to appropriate landing
5. **Direct URL access**: `/admin/login` redirects to `/login`
6. **Home page**: `/` redirects to landing or login
7. **Logout**: Works from both admin and checkin pages
8. **Staff on checkin**: Sees "Admin" link in header

---

## Risks & Considerations

1. **Email in both tables**: Not possible - staff use collaborator emails, apprentices use learner emails
2. **Magic links in transit**: Old links will break (low risk - 15min expiry)
3. **Caching**: Clear any cached auth routes after deploy
