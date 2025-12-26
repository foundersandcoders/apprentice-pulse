import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyMagicToken } from '$lib/server/auth';
import { setSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');
	const redirectTo = url.searchParams.get('redirect');

	if (!token) {
		return new Response('Token is required', { status: 400 });
	}

	const payload = verifyMagicToken(token);

	if (!payload) {
		return new Response('Invalid or expired token', { status: 401 });
	}

	// Set session cookie
	setSession(cookies, {
		email: payload.email,
		type: payload.type,
	});

	// Redirect to the intended destination or default based on user type
	if (redirectTo && redirectTo.startsWith('/')) {
		redirect(303, redirectTo);
	}

	redirect(303, payload.type === 'staff' ? '/admin' : '/');
};
