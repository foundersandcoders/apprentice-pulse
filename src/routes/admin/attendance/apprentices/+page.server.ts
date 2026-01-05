import type { PageServerLoad } from './$types';

// TODO: Implement data loading in next task
export const load: PageServerLoad = async () => {
	return {
		apprentices: [],
		cohorts: [],
		selectedCohortId: undefined as string | undefined,
	};
};
