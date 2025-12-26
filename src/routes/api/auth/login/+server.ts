import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByEmail } from '$lib/airtable/sveltekit-wrapper';
import { generateMagicToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	const { email } = await request.json();

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const user = await findUserByEmail(email);

	if (!user) {
		return json({ error: 'Email not found' }, { status: 401 });
	}

	const token = generateMagicToken(email, user.type);

	// TODO: Send email with magic link
	// For now, log token for testing
	console.log(`Magic link: /api/auth/verify?token=${token}`);

	return json({ message: 'Magic link sent' });
};
