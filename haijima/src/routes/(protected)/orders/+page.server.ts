import type { PageServerLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

const API_BASE = PUBLIC_API_URL;

export const load: PageServerLoad = async ({ fetch, locals }) => {
	try {
		const res = await fetch(`${API_BASE}/api/orders/history`, {
			headers: { Cookie: `sessionId=${locals.sessionId}` }
		});

		if (!res.ok) throw new Error('Failed to fetch orders');

		const data = await res.json();
		return {
			orders: data.orders || []
		};
	} catch (err) {
		console.error(err);
		return { orders: [] };
	}
};
