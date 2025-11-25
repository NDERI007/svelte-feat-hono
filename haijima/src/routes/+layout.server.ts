import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is already validated in hooks.server.ts
	// No additional request needed!
	return {
		user: locals.user
	};
};
