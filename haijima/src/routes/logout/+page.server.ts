import type { PageServerLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	try {
		// Call your API logout endpoint
		await fetch(`${PUBLIC_API_URL}/api/auth/logout`, {
			method: 'GET',
			credentials: 'include'
		});

		// Delete all auth-related cookies
		cookies.delete('sessionId', { path: '/' });

		console.log('User logged out successfully');
	} catch (error) {
		console.error('Logout error:', error);
	}

	// Return empty object - let client handle the redirect after cleanup
	return {};
};
