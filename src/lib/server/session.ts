import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { UserType } from './auth';

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days in seconds

export interface SessionData {
	email: string;
	type: UserType;
}

// Read and parse session cookie
export function getSession(cookies: Cookies): SessionData | null {
	const sessionCookie = cookies.get(SESSION_COOKIE_NAME);

	if (!sessionCookie) {
		return null;
	}

	try {
		const session = JSON.parse(sessionCookie) as SessionData;
		if (session.email && session.type) {
			return session;
		}
		return null;
	}
	catch {
		return null;
	}
}

// Set session cookie with 90-day expiry
export function setSession(cookies: Cookies, data: SessionData): void {
	cookies.set(SESSION_COOKIE_NAME, JSON.stringify(data), {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: SESSION_MAX_AGE,
	});
}

// Delete session cookie
export function clearSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
