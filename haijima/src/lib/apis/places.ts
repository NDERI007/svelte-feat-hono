const API_BASE = 'http://127.0.0.1:8787';

export interface PlaceResult {
	source: 'db' | 'google';
	id?: number;
	place_id: string | null;
	main_text: string;
	secondary_text: string | null;
	lat?: number | null;
	lng?: number | null;
	name?: string;
	type?: 'place' | 'query';
}

export interface SavedAddress {
	id: number;
	label?: string;
	main_text: string;
	secondary_text?: string;
	lat: number;
	lng: number;
	place_id: string;
}

/**
 * Search for places using autocomplete
 */
export async function searchPlaces(
	query: string,
	sessionToken: string,
	limit = 10
): Promise<PlaceResult[]> {
	if (!query.trim()) return [];

	const params = new URLSearchParams({
		q: query,
		sessionToken,
		limit: limit.toString()
	});

	const response = await fetch(`${API_BASE}/api/place/auto-comp?${params}`);

	if (!response.ok) {
		throw new Error(`Search failed: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Save place details to user's addresses
 */
export async function savePlaceDetails(data: {
	placeId: string;
	sessionToken: string;
	label?: string;
	main_text: string;
	secondary_text?: string;
}): Promise<{ success: boolean; address: SavedAddress; message: string }> {
	const response = await fetch(`${API_BASE}/api/v1/places/place-details`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
			// Add auth token if needed:
			// 'Authorization': `Bearer ${token}`
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to save place');
	}

	return response.json();
}

// Session token is now managed by the store
// Import: import { sessionTokenManager } from '$lib/stores/sessionToken';
