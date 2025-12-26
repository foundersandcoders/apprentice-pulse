import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/');
	}

	if (locals.user.type !== 'staff') {
		redirect(303, '/');
	}

	return {};
};
