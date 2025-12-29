import type { PageServerLoad } from './$types';
import { listCohorts } from '$lib/airtable/sveltekit-wrapper';
import { DEFAULTS } from '$lib/airtable/config';

export const load: PageServerLoad = async () => {
	const cohorts = await listCohorts();

	// Sort cohorts reverse alphabetically (newest first)
	cohorts.sort((a, b) => b.name.localeCompare(a.name));

	return {
		cohorts,
		defaultSurveyUrl: DEFAULTS.SURVEY_URL,
	};
};
