<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { supabase } from '$lib/utils/supabase/supabase.js';
	import LoadingScreen from './_components/loadingScreen.svelte';
	import ErrorScreen from './_components/errorScreen.svelte';
	import SuccessUI from './_components/SuccessUI.svelte';

	// --- 1. Props & Auth ---
	let { data } = $props();
	let user = $derived(data.user);

	// --- 2. State (Runes) ---
	let orderID = $derived(page.url.searchParams.get('orderID'));

	let orderData = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let connectionStatus = $state('connecting');

	const API_BASE = 'http://localhost:8787';
	// --- 3. Logic: Fetch Wrappers ---

	async function fetchOrderDetails() {
		try {
			// ✅ FIXED: Standard fetch
			const res = await fetch(`${API_BASE}/api/orders/${orderID}`, { credentials: 'include' });

			if (!res.ok) {
				throw new Error('Failed to fetch order');
			}

			const json = await res.json();
			// Matches Hono backend: res.json({ order: data })
			orderData = json.order;

			loading = false;
			connectionStatus = 'connected';
		} catch (e) {
			console.error(e);
			error = 'Failed to load order details.';
			loading = false;
		}
	}

	async function checkPaymentStatus() {
		try {
			const res = await fetch(`${API_BASE}/api/orders/${orderID}/payment-status`, {
				credentials: 'include'
			});

			if (!res.ok) {
				// Handle 404 or 500
				if (res.status === 404) return 'pending';
				throw new Error('Status check failed');
			}

			const status = await res.json();

			// Handle Failure
			if (status.has_failed || status.payment_status === 'failed') {
				error = `Payment failed. Please try again.`;
				loading = false;
				return 'failed';
			}

			// Handle Success
			if (status.is_complete || status.payment_status === 'paid') {
				await fetchOrderDetails();
				return 'completed';
			}

			return 'pending';
		} catch (e) {
			console.warn('Check failed', e);
			// We don't set error here, we just keep waiting/listening
			return 'error';
		}
	}

	// --- 4. Lifecycle & Realtime ---
	onMount(() => {
		// Auth Redirect
		if (!user) {
			const returnUrl = `/confirmation?orderID=${orderID}`;
			goto(`/login?from=${encodeURIComponent(returnUrl)}`);
			return;
		}

		if (!orderID) {
			error = 'Missing Order ID';
			loading = false;
			return;
		}

		// A. Initial HTTP Check (In case it's already paid)
		checkPaymentStatus();

		// B. Supabase Realtime (The "Socket")
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
						await fetchOrderDetails();
						supabase.removeChannel(channel);
					} else if (newStatus === 'failed') {
						error = 'Payment Failed';
						loading = false;
						supabase.removeChannel(channel);
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					connectionStatus = 'connected';
				}
			});

		// C. Safety Timeout (60 seconds)
		const safetyTimer = setTimeout(() => {
			if (loading) {
				error = 'Payment verification timed out. Please check your M-PESA messages.';
				loading = false;
				supabase.removeChannel(channel);
			}
		}, 60000);

		// Cleanup
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
