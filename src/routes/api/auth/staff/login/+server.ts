import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findStaffByEmail } from '$lib/airtable/sveltekit-wrapper';
import { generateMagicToken } from '$lib/server/auth';
import { sendMagicLinkEmail } from '$lib/server/email';

export const POST: RequestHandler = async ({ request, url }) => {
	const { email } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const isStaff = await findStaffByEmail(email);

	if (!isStaff) {
		return json({ error: 'Email not found in staff directory' }, { status: 401 });
	}

	const token = generateMagicToken(email, 'staff');

	// Build magic link URL
	const verifyUrl = new URL('/api/auth/verify', url.origin);
	verifyUrl.searchParams.set('token', token);

	const result = await sendMagicLinkEmail(email, verifyUrl.toString(), 'staff');

	if (!result.success) {
		return json({ error: 'Failed to send email. Please try again.' }, { status: 500 });
	}

	return json({ message: 'Magic link sent! Check your email.' });
};
