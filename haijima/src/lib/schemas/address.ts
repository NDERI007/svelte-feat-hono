export interface DeliveryLocation {
	address?: string; // The full, formatted address string
	lat: number; // Required for distance calc (or 0 if unknown)
	lng: number; // Required for distance calc (or 0 if unknown)
	place_id?: string; // Google Place ID (optional, but good for reference)
}
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
	id?: string; // From DB (optional)
	label?: string; // "Home", "Work" etc.
	place_name?: string | null;
	address?: string;
	main_text: string; // Google / structured data
	secondary_text: string;
	lat: number;
	lng: number;
	place_id?: string; // Google-specific
}
