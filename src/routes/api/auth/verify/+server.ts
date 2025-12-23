import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyMagicToken } from '$lib/server/auth';

const SESSION_DURATION_DAYS = 90;

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return new Response('Token is required', { status: 400 });
	}

	const payload = verifyMagicToken(token);

	if (!payload) {
		return new Response('Invalid or expired token', { status: 401 });
	}

	// Set session cookie
	cookies.set('session', JSON.stringify({
		email: payload.email,
		type: payload.type,
	}), {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
	});

	redirect(303, '/');
};
