import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		// Redirect authenticated users to their landing page
		if (locals.user.type === 'staff') {
			redirect(303, '/admin');
		}
		else {
			redirect(303, '/checkin');
		}
	}

	// Redirect unauthenticated users to login
	redirect(303, '/login');
};
