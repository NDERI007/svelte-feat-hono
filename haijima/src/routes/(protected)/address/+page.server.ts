import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';

const API_BASE = PUBLIC_API_URL;

export const load: PageServerLoad = async ({ fetch, locals }) => {
	try {
		const res = await fetch(`${API_BASE}/api/address/look-up`, {
			headers: { Cookie: `sessionId=${locals.sessionId}` }
		});

		if (!res.ok) throw new Error('Failed to fetch addresses');

		const data = await res.json();
		return {
			addresses: data.addresses || []
		};
	} catch (err) {
		console.error(err);
		return { addresses: [] };
	}
};

export const actions: Actions = {
	create: async ({ request, fetch, locals }) => {
		const formData = await request.formData();

		// Extract raw data
		const label = formData.get('label') as string;
		const place_id = formData.get('place_id') as string;
		const main_text = formData.get('main_text') as string;
		const secondary_text = formData.get('secondary_text') as string;

		// Lat/Lng might be missing if the user just selected a prediction without details
		let lat = formData.get('lat');
		let lng = formData.get('lng');

		if (!label || !place_id) {
			return fail(400, { error: 'Label and address are required' });
		}

		try {
			// 1. If Lat/Lng are missing, fetch place details first (Server-to-Server)
			if (!lat || !lng) {
				const detailsRes = await fetch(`${API_BASE}/api/places/place-details`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Cookie: `sessionId=${locals.sessionId}`
					},
					body: JSON.stringify({ placeId: place_id })
				});

				const details = await detailsRes.json();
				if (details.success && details.address) {
					lat = details.address.lat;
					lng = details.address.lng;
				}
			}

			// 2. Save Address
			const payload = {
				label,
				place_name: main_text,
				address: secondary_text,
				place_id,
				lat: Number(lat),
				lng: Number(lng)
			};

			const saveRes = await fetch(`${API_BASE}/api/address/upsert`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: `sessionId=${locals.sessionId}`
				},
				body: JSON.stringify(payload)
			});

			if (!saveRes.ok) throw new Error('Failed to save address');

			return { success: true };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to save address' });
		}
	},

	delete: async ({ request, fetch, locals }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { error: 'Missing ID' });

		try {
			const res = await fetch(`${API_BASE}/api/address/${id}`, {
				method: 'DELETE',
				headers: { Cookie: `sessionId=${locals.sessionId}` }
			});

			if (!res.ok) throw new Error('Failed to delete');
			return { success: true };
		} catch (err) {
			return fail(500, { error: 'Could not delete address' });
		}
	}
};
