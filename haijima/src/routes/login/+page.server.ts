import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { dev } from '$app/environment';

// Change this to wherever your Hono server runs
const API_URL = 'http://localhost:8787';

export const actions = {
	// ----------------------------------------------------
	// Action 1: Send the OTP
	// ----------------------------------------------------
	send: async ({ request, fetch }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) return fail(400, { error: 'Email is required' });

		try {
			// Call Hono API
			const res = await fetch(`${API_URL}/api/auth/send-otp`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await res.json();

			if (!res.ok) {
				return fail(res.status, {
					error: data.error || 'Failed to send OTP',
					email
				});
			}

			return { success: true, step: 'verify', email };
		} catch (err) {
			console.error('API Error:', err);
			return fail(500, { error: 'Backend unavailable', email });
		}
	},

	// ----------------------------------------------------
	// Action 2: Verify the Code
	// ----------------------------------------------------
	verify: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const code = formData.get('code') as string;
		const redirectTo = formData.get('redirectTo')?.toString() ?? '/dashboard';

		if (!code || !email) {
			return fail(400, { error: 'Missing code', step: 'verify', email });
		}

		try {
			// Call Hono API
			const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code })
			});
			console.log('1. Hono Status:', res.status);

			const data = await res.json();

			if (!res.ok) {
				return fail(res.status, {
					error: data.error || 'Invalid OTP',
					step: 'verify',
					email
				});
			}

			// --- THE COOKIE BRIDGE ---
			// Hono sent a 'Set-Cookie' header to SvelteKit.
			// We must extract the 'sessionId' and forward it to the browser.

			const setCookieHeader = res.headers.get('set-cookie');
			console.log('2. Hono Raw Header:', setCookieHeader);
			if (setCookieHeader) {
				// Parse the sessionId value using regex
				// Looking for "sessionId=xyz..."
				const match = setCookieHeader.match(/sessionId=([^;]+)/);
				// Removes quotes if they exist
				const token = match ? match[1].replace(/^"|"$/g, '') : null;
				console.log('4. Token to Save:', token);

				if (token) {
					cookies.set('sessionId', token, {
						path: '/',
						httpOnly: true,
						secure: !dev,
						sameSite: 'lax',
						// Match Hono's INACTIVITY_TIMEOUT (10 days)
						maxAge: 60 * 60 * 24 * 10
					});
					console.log('5. Cookie Set Command Issued');
				}
			}

			// Redirect to dashboard
			throw redirect(303, redirectTo.startsWith('/') ? redirectTo : '/dashboard');
		} catch (err) {
			// Check if it was our redirect throwing (which is good)
			if ((err as any)?.status === 303) throw err;

			console.error('API Error:', err);
			return fail(500, { error: 'Backend unavailable', step: 'verify', email });
		}
	}
} satisfies Actions;
