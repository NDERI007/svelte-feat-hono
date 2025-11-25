import type { DeliveryLocation, PlaceResult } from '$lib/schemas/address';

const API_BASE = 'http://127.0.0.1:8787';

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

export function resolveLocationFromPrediction(prediction: PlaceResult): DeliveryLocation {
	// A. Merge the text nicely
	// e.g. "Silent Hostel" + "Gate C" => "Silent Hostel, Gate C"
	let fullAddress = prediction.main_text;
	if (prediction.secondary_text) {
		fullAddress = `${prediction.main_text}, ${prediction.secondary_text}`;
	}

	// B. Handle Coordinates
	// DB results usually have them. Google results usually don't (yet).
	// If missing, we default to 0. The store knows that 0 means "Standard Fee".
	const lat = prediction.lat ?? 0;
	const lng = prediction.lng ?? 0;

	return {
		address: fullAddress,
		lat: lat,
		lng: lng,
		place_id: prediction.place_id ?? undefined
	};
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
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to save place');
	}

	return response.json();
}
