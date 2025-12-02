<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolveLocationFromPrediction } from '$lib/apis/places';
	import PlaceAutocomplete from '$lib/components/autoplaces.svelte';
	import type { PlaceResult } from '$lib/schemas/address';
	import { deliveryStore } from '$lib/stores/delivery.svelte';

	function handlePlaceSelected(place: PlaceResult) {
		const location = resolveLocationFromPrediction(place);
		deliveryStore.setDeliveryAddress(location);
		goto('/dashboard');
	}
</script>

<section class="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
	<!-- Warm terracotta glow - subtle and sophisticated -->
	<div
		class="absolute top-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-orange-100 to-amber-100 blur-3xl opacity-40 -z-10"
	></div>

	<!-- Complementary warm accent -->
	<div
		class="absolute bottom-1/3 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-amber-50 to-orange-50 blur-3xl opacity-30 -z-10"
	></div>

	<div
		class="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 py-12 lg:grid-cols-5 lg:gap-16 lg:px-8"
	>
		<div class="col-span-1 text-center lg:col-span-3 lg:text-left">
			<h1 class="font-semibold tracking-tighter leading-[0.9]">
				<span class="block text-6xl lg:text-[7rem] text-[var(--color-text)]">The Easy</span>
				<span class="block text-7xl lg:text-[9rem] text-[var(--color-theme-1)]">Meals for</span>
				<span class="block text-6xl lg:text-[7rem] text-[var(--color-text)]">Busy Days</span>
			</h1>
		</div>

		<div class="col-span-1 lg:col-span-2">
			<div
				class="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300"
			>
				<div class="mb-6 flex flex-col gap-1">
					<p class="text-xl font-bold tracking-tight text-[var(--color-text)]">
						Open Daily: 9:00 AM - 9:30 PM
					</p>
				</div>

				<div>
					<label
						for="landing-search"
						class="mb-3 block text-sm font-semibold text-[var(--color-text-muted)]"
					>
						Where are we delivering?
					</label>
					<PlaceAutocomplete
						id="landing-search"
						placeholder="Enter delivery address to start..."
						onPlaceSelected={handlePlaceSelected}
					/>
				</div>

				<div class="mt-6 text-center">
					<a
						href="/dashboard"
						class="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-theme-1)] transition-colors group"
					>
						Skip & Browse Menu
						<span class="inline-block transition-transform group-hover:translate-x-1">→</span>
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
