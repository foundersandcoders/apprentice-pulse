import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/session';

// Routes that require staff access (including external users)
const ADMIN_ROUTES = ['/admin'];

// Routes that require any authenticated user
const PROTECTED_ROUTES: string[] = []; // /checkin now handles auth internally for guest support

// Login route - redirect if already authenticated
const AUTH_ROUTES = ['/login'];

function isPathMatch(pathname: string, routes: string[]): boolean {
	return routes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

export const handle: Handle = async ({ event, resolve }) => {
	const session = getSession(event.cookies);

	// Set user in locals for all routes
	event.locals.user = session;

	const { pathname } = event.url;

	// Skip protection for API routes (they handle their own auth)
	if (pathname.startsWith('/api/')) {
		return resolve(event);
	}

	// Check admin routes - require staff or external access
	if (isPathMatch(pathname, ADMIN_ROUTES)) {
		if (!session) {
			redirect(303, '/login?redirect=' + encodeURIComponent(pathname));
		}

		if (session.type === 'staff' || session.type === 'external') {
			// Staff and external users have full admin access
		}
		else {
			// Students trying to access admin get redirected to checkin
			redirect(303, '/checkin');
		}
	}

	// Check protected routes - require any authenticated user
	if (isPathMatch(pathname, PROTECTED_ROUTES)) {
		if (!session) {
			redirect(303, '/login?redirect=' + encodeURIComponent(pathname));
		}
	}

	// Redirect authenticated users away from login page
	if (isPathMatch(pathname, AUTH_ROUTES) && session) {
		let redirectTo = '/checkin'; // default for students
		if (session.type === 'staff' || session.type === 'external') {
			redirectTo = '/admin';
		}
		redirect(303, redirectTo);
	}

	return resolve(event);
};
