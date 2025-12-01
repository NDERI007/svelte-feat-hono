import { error } from '@sveltejs/kit';
import type { PageServerLoad } from '../../login/$types';
import { PUBLIC_API_URL } from '$env/static/public';

const HONO_URL = PUBLIC_API_URL;

export const load: PageServerLoad = async ({ url, fetch, locals }) => {
	const orderID = url.searchParams.get('orderID');
	const sessionId = locals.sessionId;

	if (!orderID) {
		return { status: 'error', message: 'Missing Order ID' };
	}

	try {
		// 1. Check Payment Status
		// We pass the cookie manually because this runs on the server
		const statusRes = await fetch(`${HONO_URL}/api/orders/${orderID}/payment-status`, {
			headers: { Cookie: `sessionId=${sessionId}` }
		});

		if (!statusRes.ok) {
			// If 404, maybe order doesn't exist yet (race condition)
			if (statusRes.status === 404) return { status: 'pending', orderID };
			throw error(statusRes.status, 'Failed to check status');
		}

		const statusData = await statusRes.json();

		// 2. IF PAID: Fetch Order Details immediately
		let orderData = null;
		if (statusData.payment_status === 'paid' || statusData.is_complete) {
			const detailsRes = await fetch(`${HONO_URL}/api/orders/${orderID}`, {
				headers: { Cookie: `sessionId=${sessionId}` }
			});

			if (detailsRes.ok) {
				const json = await detailsRes.json();
				orderData = json.order;
			}
		}

		return {
			status: statusData.payment_status === 'paid' ? 'completed' : 'pending',
			paymentData: statusData,
			orderData, // Will be null if pending, populated if paid
			orderID
		};
	} catch (err) {
		console.error('Load Error:', err);
		return { status: 'error', message: 'Could not load order' };
	}
};
