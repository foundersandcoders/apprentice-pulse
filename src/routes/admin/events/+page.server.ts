import type { PageServerLoad } from './$types';
import { listEvents, listCohorts } from '$lib/airtable/sveltekit-wrapper';

export const load: PageServerLoad = async ({ url }) => {
	const cohortId = url.searchParams.get('cohort') ?? undefined;

	const [events, cohorts] = await Promise.all([
		listEvents({ cohortId }),
		listCohorts(),
	]);

	// Sort cohorts reverse alphabetically (newest cohorts first)
	cohorts.sort((a, b) => b.name.localeCompare(a.name));

	return {
		events,
		cohorts,
		selectedCohortId: cohortId,
	};
};
