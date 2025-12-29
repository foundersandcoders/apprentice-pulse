import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Redirect to main events page - form is now inline
export const load: PageServerLoad = async () => {
	redirect(301, '/admin/events');
};
