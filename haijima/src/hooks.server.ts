import type { Handle } from '@sveltejs/kit';

const API_URL = 'http://localhost:8787';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Get the session ID from the browser's cookies
	const sessionId = event.cookies.get('sessionId');

	if (!sessionId) {
		event.locals.user = null;
	} else {
		// 2. Validate with Hono Backend
		try {
			// We must manually pass the cookie to Hono
			const res = await fetch(`${API_URL}/context-verif`, {
				headers: {
					Cookie: `sessionId=${sessionId}`
				}
			});

			const data = await res.json();

			if (data.authenticated && data.user) {
				event.locals.user = data.user;
			} else {
				// Token is invalid/expired according to Hono
				event.locals.user = null;
				// Optional: Cleanup invalid cookie
				event.cookies.delete('sessionId', { path: '/' });
			}
		} catch (err) {
			console.error('Auth Check Failed:', err);
			event.locals.user = null;
		}
	}

	return resolve(event);
};
