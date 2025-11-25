import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is already validated in hooks.server.ts
	// No additional request needed!
	console.log('Layout Load - User:', locals.user ? locals.user.email : 'NULL');
	return {
		user: locals.user
	};
};
