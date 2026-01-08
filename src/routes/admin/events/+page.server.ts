import type { PageServerLoad } from './$types';
import { listEvents, listCohorts } from '$lib/airtable/sveltekit-wrapper';
import { DEFAULTS } from '$lib/airtable/config';
import { eventTypesService } from '$lib/services/event-types';

export const load: PageServerLoad = async ({ url }) => {
	const cohortId = url.searchParams.get('cohort') ?? undefined;

	const [events, cohorts, eventTypes] = await Promise.all([
		listEvents({ cohortId }),
		listCohorts(),
		eventTypesService.getEventTypes(),
	]);

	// Sort cohorts reverse alphabetically (newest cohorts first)
	cohorts.sort((a, b) => b.name.localeCompare(a.name));

	return {
		events,
		cohorts,
		eventTypes,
		selectedCohortId: cohortId,
		defaultSurveyUrl: DEFAULTS.SURVEY_URL,
	};
};
