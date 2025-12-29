import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getEvent, listCohorts } from '$lib/airtable/sveltekit-wrapper';
import { DEFAULTS } from '$lib/airtable/config';

export const load: PageServerLoad = async ({ params }) => {
	const [event, cohorts] = await Promise.all([
		getEvent(params.id),
		listCohorts(),
	]);

	if (!event) {
		error(404, 'Event not found');
	}

	// Sort cohorts reverse alphabetically (newest first)
	cohorts.sort((a, b) => b.name.localeCompare(a.name));

	return {
		event,
		cohorts,
		defaultSurveyUrl: DEFAULTS.SURVEY_URL,
	};
};
