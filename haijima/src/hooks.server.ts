import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';
const API_URL = PUBLIC_API_URL;

export const handle: Handle = async ({ event, resolve }) => {
	// AUTHENTICATION (Who are you?)

	const sessionId = event.cookies.get('sessionId');

	// Default to null
	event.locals.user = null;
	event.locals.sessionId = sessionId; // Useful to keep this for +page.server.ts fetches

	if (sessionId) {
		try {
			// Validate with Hono Backend
			const res = await fetch(`${API_URL}/api/auth/context-verif`, {
				headers: {
					Cookie: `sessionId=${sessionId}`
				}
				// credentials: 'include' is not needed here (server-to-server fetch)
			});

			if (res.ok) {
				const data = await res.json();
				if (data.authenticated && data.user) {
					event.locals.user = data.user;
				} else {
					// Token is invalid/expired according to Hono
					// Clean up the bad cookie so the browser stops sending it
					event.cookies.delete('sessionId', { path: '/' });
				}
			}
		} catch (err) {
			console.error('Auth Check Failed:', err);
		}
	}

	// AUTHORIZATION (Are you allowed here?)

	// Check if the directory path contains "(protected)"
	if (event.route.id?.includes('(protected)')) {
		// If the user was NOT populated in Step 1, kick them out
		if (!event.locals.user) {
			const fromUrl = event.url.pathname + event.url.search;
			throw redirect(303, `/login?from=${encodeURIComponent(fromUrl)}`);
		}
	}

	return resolve(event);
};
