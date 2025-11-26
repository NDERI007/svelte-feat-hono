<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import AddressSearch from './autoplaces.svelte';

	import type { SavedAddress, PlaceResult, DeliveryLocation } from '$lib/schemas/address';
	import { resolveLocationFromPrediction } from '$lib/apis/places';

	interface Props {
		open: boolean;

		onSelect: (location: DeliveryLocation) => void;
		savedAddresses: SavedAddress[];
		isLoading: boolean;
	}

	// ✅ FIX 1: Mark 'open' as $bindable()
	let { open = $bindable(), onSelect, savedAddresses, isLoading }: Props = $props();

	// Handle selection from the Search Component
	function handleSearchSelect(place: PlaceResult) {
		const formattedLocation = resolveLocationFromPrediction(place);
		onSelect(formattedLocation);
		open = false; // ✅ FIX 2: Close directly by mutating state
	}

	// Handle selection from Saved List
	function handleSavedSelect(saved: SavedAddress) {
		let finalAddress = saved.label;
		if (saved.main_text) {
			finalAddress = saved.secondary_text
				? `${saved.main_text}, ${saved.secondary_text}`
				: saved.main_text;
		}

		const formattedLocation: DeliveryLocation = {
			address: finalAddress,
			lat: saved.lat,
			lng: saved.lng,
			place_id: saved.place_id
		};

		onSelect(formattedLocation);
		open = false;
	}

	function close() {
		open = false;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 200 }}
			onclick={close}
			aria-hidden="true"
		></div>

		<div
			class="relative z-10 flex w-full max-w-md max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<div class="flex items-center justify-between border-b border-gray-100 p-5 pb-4">
				<h2 class="text-xl font-semibold text-gray-900">Delivery Address</h2>
				<button
					onclick={close}
					class="rounded-full p-1 text-gray-500 hover:bg-gray-100 transition-colors"
				>
					<Icon icon="lucide:x" width="24" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto p-5 pt-2">
				<div class="mb-6 sticky top-0 bg-white pt-2 z-10 pb-2">
					<AddressSearch onPlaceSelected={handleSearchSelect} />
				</div>

				<div>
					<p class="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wider">
						Saved Addresses
					</p>

					<div class="space-y-3">
						{#if isLoading}
							<div
								class="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-6 text-gray-500"
							>
								<Icon icon="lucide:loader-2" class="animate-spin" />
								<span class="text-sm">Loading your addresses...</span>
							</div>
						{:else if savedAddresses.length > 0}
							{#each savedAddresses as saved (saved.id)}
								<button
									onclick={() => handleSavedSelect(saved)}
									class="group w-full rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-green-200 hover:bg-green-50/30 transition-all shadow-sm hover:shadow-md"
								>
									<div class="flex items-start gap-3">
										<div
											class="rounded-full bg-green-100 p-2 text-green-600 group-hover:bg-green-200 transition-colors"
										>
											<Icon icon="lucide:home" width="18" />
										</div>
										<div>
											<p class="font-semibold text-gray-900">{saved.label}</p>
											<p class="text-sm text-gray-600 line-clamp-2">{saved.place_name}</p>
										</div>
									</div>
								</button>
							{/each}
						{:else}
							<div class="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
								<p>No saved addresses found.</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
