import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEventsByCode } from '$lib/airtable/sveltekit-wrapper';

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
		const events = await getEventsByCode(codeNum);

		if (events.length === 0) {
			return json({ valid: false, error: 'Invalid code or no events found for today/tomorrow' }, { status: 404 });
		}

		// Sort by date (most recent first)
		events.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

		return json({
			valid: true,
			events: events.map(event => ({
				id: event.id,
				name: event.name,
				dateTime: event.dateTime,
				eventType: event.eventType,
				attendanceCount: event.attendanceCount ?? 0,
			})),
		});
	}
	catch (error) {
		console.error('Failed to validate code:', error);
		return json({ valid: false, error: 'Failed to validate code' }, { status: 500 });
	}
};
