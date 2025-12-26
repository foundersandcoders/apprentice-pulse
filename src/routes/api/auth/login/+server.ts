import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByEmail } from '$lib/airtable/sveltekit-wrapper';
import { generateMagicToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, url }) => {
	const { email, redirect: redirectPath } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const user = await findUserByEmail(email);

	if (!user) {
		return json({ error: 'Email not found' }, { status: 401 });
	}

	const token = generateMagicToken(email, user.type);

	// Build magic link URL with optional redirect
	const verifyUrl = new URL('/api/auth/verify', url.origin);
	verifyUrl.searchParams.set('token', token);
	if (redirectPath && redirectPath.startsWith('/')) {
		verifyUrl.searchParams.set('redirect', redirectPath);
	}

	// TODO: Send email with magic link (AP-13)
	// For now, log token for testing
	console.log(`Magic link: ${verifyUrl.pathname}${verifyUrl.search}`);

	return json({ message: 'Magic link sent! Check your email.' });
};
