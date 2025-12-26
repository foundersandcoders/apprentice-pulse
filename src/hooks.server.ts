import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionCookie = event.cookies.get('session');

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);
			event.locals.user = {
				email: session.email,
				type: session.type,
			};
		}
		catch {
			event.locals.user = null;
		}
	}
	else {
		event.locals.user = null;
	}

	return resolve(event);
};
