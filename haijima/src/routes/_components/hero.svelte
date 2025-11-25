<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolveLocationFromPrediction } from '$lib/apis/places';
	import PlaceAutocomplete from '$lib/components/autoplaces.svelte';
	import type { PlaceResult } from '$lib/schemas/address';
	import { deliveryStore } from '$lib/stores/delivery.svelte';

	function handlePlaceSelected(place: PlaceResult) {
		console.log('📍 User selected:', place.main_text);

		const location = resolveLocationFromPrediction(place);

		// 2. Save to the global Delivery Store
		// Now the Cart and Checkout pages know where to deliver!
		deliveryStore.setDeliveryAddress(location);

		// 3. UX: Automatically take them to the menu/shop page
		goto('/dashboard');
	}
</script>

<section
	class="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-12 lg:min-h-[80vh] lg:grid-cols-5 lg:gap-8 lg:px-8 lg:py-16"
>
	<div
		class="col-span-1 text-center leading-none font-black text-[var(--color-theme-1)] uppercase lg:col-span-3 lg:text-left"
	>
		<span class="block text-5xl tracking-tighter lg:text-[6rem]">The Easy</span>
		<span class="block text-6xl tracking-tighter lg:text-[8rem]">Meals for</span>
		<span class="block text-5xl tracking-tighter lg:text-[6rem]">Busy Days</span>
	</div>

	<!-- COLUMN 2: The Content -->
	<div class="col-span-1 flex flex-col gap-6 lg:col-span-2">
		<!-- Info Block -->
		<div class="flex flex-col gap-1 text-[var(--color-theme-1)]">
			<p class="text-lg font-semibold tracking-tight">Open Daily: 9:00 AM - 9:30 PM</p>
			<!-- Used var(--color-theme-2) (lighter green) for secondary text -->
			<p class="text-md font-medium text-[var(--color-theme-2)] opacity-90">
				Delivery within a 5km radius or available for pickup.
			</p>
		</div>

		<div
			class="rounded-xl border border-[var(--color-theme-1)]/10 bg-white/40 p-4 backdrop-blur-sm"
		>
			<PlaceAutocomplete
				placeholder="Enter delivery address"
				onPlaceSelected={handlePlaceSelected}
			/>
		</div>
	</div>
</section>
