import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findApprenticeByEmail } from '$lib/airtable/sveltekit-wrapper';
import { generateMagicToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, url }) => {
	const { email } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const isApprentice = await findApprenticeByEmail(email);

	if (!isApprentice) {
		return json({ error: 'Email not found' }, { status: 401 });
	}

	const token = generateMagicToken(email, 'student');

	// Build magic link URL
	const verifyUrl = new URL('/api/auth/verify', url.origin);
	verifyUrl.searchParams.set('token', token);

	// TODO: Send email with magic link (AP-13)
	// For now, log token for testing
	console.log(`[Student] Magic link: ${verifyUrl.pathname}${verifyUrl.search}`);

	return json({ message: 'Magic link sent! Check your email.' });
};
