import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/session';

// Routes that require staff access
const ADMIN_ROUTES = ['/admin'];
// Admin login page (excluded from admin protection)
const ADMIN_LOGIN = '/admin/login';

// Routes that require any authenticated user
const PROTECTED_ROUTES: string[] = []; // /checkin now handles auth internally for guest support

// Login routes - redirect if already authenticated
const AUTH_ROUTES = ['/login', '/admin/login'];

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

	// Check admin routes (excluding admin login page) - require staff
	if (isPathMatch(pathname, ADMIN_ROUTES) && pathname !== ADMIN_LOGIN) {
		if (!session) {
			redirect(303, '/admin/login?redirect=' + encodeURIComponent(pathname));
		}
		if (session.type !== 'staff') {
			// Students trying to access admin get redirected to checkin or home
			redirect(303, '/');
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
		const redirectTo = session.type === 'staff' ? '/admin' : '/';
		redirect(303, redirectTo);
	}

	return resolve(event);
};
