import type { PageServerLoad } from './$types';

// Route protection is handled by hooks.server.ts
// This load function just passes through - user data comes from layout
export const load: PageServerLoad = async () => {
	return {};
};
