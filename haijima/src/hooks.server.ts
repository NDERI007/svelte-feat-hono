import type { Handle } from '@sveltejs/kit';

const API_URL = 'http://127.0.0.1:8787';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Get the session ID from the browser's cookies
	const sessionId = event.cookies.get('sessionId');

	if (!sessionId) {
		event.locals.user = null;
	} else {
		// 2. Validate with Hono Backend
		try {
			// We must manually pass the cookie to Hono
			const res = await fetch(`${API_URL}/api/auth/context-verif`, {
				headers: {
					Cookie: `sessionId=${sessionId}`
				},
				credentials: 'include'
			});

			const data = await res.json();
			console.log('Hono Status:', res.status); // Likely 200
			console.log('Hono Payload:', JSON.stringify(data, null, 2)); // <--- THIS IS KEY

			if (data.authenticated && data.user) {
				console.log('✅ Setting locals.user');
				event.locals.user = data.user;
			} else {
				console.log('❌ Auth rejected by logic');
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
