import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEventByCode } from '$lib/airtable/sveltekit-wrapper';

export const POST: RequestHandler = async ({ request }) => {
	let body: { code?: string };
	try {
		body = await request.json();
	}
	catch {
		return json({ valid: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const { code } = body;

	if (!code) {
		return json({ valid: false, error: 'code is required' }, { status: 400 });
	}

	// Validate code format (4 digits)
	const codeNum = parseInt(code, 10);
	if (isNaN(codeNum) || codeNum < 1000 || codeNum > 9999) {
		return json({ valid: false, error: 'Code must be a 4-digit number' }, { status: 400 });
	}

	try {
		const event = await getEventByCode(codeNum);

		if (!event) {
			return json({ valid: false, error: 'Invalid code or event not found' }, { status: 404 });
		}

		return json({
			valid: true,
			event: {
				id: event.id,
				name: event.name,
				dateTime: event.dateTime,
				eventType: event.eventType,
			},
		});
	}
	catch (error) {
		console.error('Failed to validate code:', error);
		return json({ valid: false, error: 'Failed to validate code' }, { status: 500 });
	}
};
