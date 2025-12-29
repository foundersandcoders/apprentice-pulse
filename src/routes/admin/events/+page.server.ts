import type { PageServerLoad } from './$types';
import { listEvents } from '$lib/airtable/sveltekit-wrapper';

export const load: PageServerLoad = async ({ url }) => {
	const cohortId = url.searchParams.get('cohort') ?? undefined;

	const events = await listEvents({ cohortId });

	return {
		events,
		selectedCohortId: cohortId,
	};
};
