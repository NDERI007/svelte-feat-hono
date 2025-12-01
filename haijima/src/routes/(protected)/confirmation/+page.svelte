<script lang="ts">
	import { onMount } from 'svelte';

	import { supabase } from '$lib/utils/supabase/supabase.js';
	import LoadingScreen from './_components/loadingScreen.svelte';
	import SuccessUI from './_components/SuccessUI.svelte';
	import ErrorScreen from './_components/errorScreen.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// --- State Initialized from Server Data ---
	// If server says 'completed', loading starts as false!
	let loading = $state(data.status === 'pending');
	let orderData = $state(data.orderData);
	let error = $state(data.status === 'error' ? data.message : null);
	let connectionStatus = $state('connecting');

	const orderID = data.orderID; // Passed from server

	// Helper to fetch details (Client-side)
	// Only used if the update happens via Realtime while user is watching
	async function fetchOrderDetailsClient() {
		try {
			const res = await fetch(`/api/orders/${orderID}`, { credentials: 'include' });
			const json = await res.json();
			orderData = json.order;
			loading = false;
			connectionStatus = 'connected';
		} catch (e) {
			error = 'Failed to load details';
		}
	}

	onMount(() => {
		// 1. If we already have the data, do nothing!
		if (data.status === 'completed' && orderData) {
			return;
		}

		// 2. If there was a server error, stop.
		if (error) return;

		// 3. Start Realtime ONLY if pending
		const channel = supabase
			.channel(`order-watch-${orderID}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'orders',
					filter: `id=eq.${orderID}`
				},
				async (payload) => {
					const newStatus = payload.new.payment_status;

					if (newStatus === 'paid') {
						await fetchOrderDetailsClient();
						supabase.removeChannel(channel);
					} else if (newStatus === 'failed') {
						error = 'Payment Failed';
						loading = false;
						supabase.removeChannel(channel);
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') connectionStatus = 'connected';
			});

		// 4. Safety Timeout
		const safetyTimer = setTimeout(() => {
			if (loading) {
				error = 'Payment verification timed out.';
				loading = false;
				supabase.removeChannel(channel);
			}
		}, 60000);

		return () => {
			clearTimeout(safetyTimer);
			supabase.removeChannel(channel);
		};
	});
</script>

{#if loading}
	<LoadingScreen message="Verifying Payment..." {connectionStatus} />
{:else if error}
	<ErrorScreen
		{error}
		onRetry={() => window.location.reload()}
		onViewOrders={() => goto('/orders')}
	/>
{:else if orderData}
	<SuccessUI {orderData} />
{/if}
