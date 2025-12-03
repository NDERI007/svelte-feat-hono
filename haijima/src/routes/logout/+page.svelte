<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import { cartStore } from '$lib/stores/cart.svelte';
	import { deliveryStore } from '$lib/stores/delivery.svelte';

	onMount(async () => {
		if (browser) {
			// 1. Reset stores to guest state first
			cartStore.reset();
			deliveryStore.reset();

			// 2. Clear all localStorage (catches anything else)
			localStorage.clear();
			sessionStorage.clear();

			// 3. Invalidate all SvelteKit load functions
			await invalidateAll();

			// 4. Small delay to ensure everything is cleared
			await new Promise((resolve) => setTimeout(resolve, 100));

			// 5. Navigate to login with replaceState to prevent back button issues
			await goto('/login', {
				replaceState: true,
				invalidateAll: true
			});
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p class="text-lg">Logging out...</p>
</div>

<svelte:head>
	<title>Logging out...</title>
</svelte:head>
