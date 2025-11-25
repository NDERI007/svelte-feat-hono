import type { ProductVariant } from '$lib/schemas/menu';
import { supabase } from '$lib/utils/supabase/supabase'; // Ensure this path matches your client export

const API_BASE = 'http://127.0.0.1:8787';
/**
 * A Svelte 5 "Hook" for live variant data.
 * @param productIdGetter A function that returns the current productId (or null)
 */
export function getLiveVariants(productIdGetter: () => string | undefined) {
	// --- State ---
	let variants = $state<ProductVariant[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// --- Effect ---
	// This runs whenever the result of productIdGetter() changes.
	$effect(() => {
		const id = productIdGetter();

		// If no ID (e.g. modal closed), reset and do nothing
		if (!id) {
			return;
		}

		let isCleanedUp = false;

		// 1. Define the Fetcher
		const fetchData = async () => {
			isLoading = true;
			try {
				const res = await fetch(`${API_BASE}/api/prod/menu-items/${id}/variants`);
				if (res.ok) {
					const data = await res.json();
					if (!isCleanedUp) variants = data;
				} else {
					console.error('Failed to fetch variants');
				}
			} catch (e) {
				console.error(e);
			} finally {
				if (!isCleanedUp) isLoading = false;
			}
		};

		// 2. Initial Fetch
		fetchData();

		// 3. Supabase Realtime Subscription
		// Listens for ANY change to the 'product_variants' table for this specific product
		const channel = supabase
			.channel(`product-variants-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*', // INSERT, UPDATE, DELETE
					schema: 'public',
					table: 'product_variants',
					filter: `product_id=eq.${id}`
				},
				() => {
					console.log('⚡ Variant changed, refetching...');
					fetchData(); // Re-run fetch to get fresh data
				}
			)
			.subscribe();

		// 4. Cleanup
		return () => {
			isCleanedUp = true;
			supabase.removeChannel(channel);
		};
	});

	// Return getters so the component can read the state
	return {
		get data() {
			return variants;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		}
	};
}
