<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import { toast } from 'svelte-sonner';
	import PlaceSearch from '$lib/components/autoplaces.svelte';
	import type { PlaceResult } from '$lib/schemas/address.js';

	let { data } = $props();

	// Local state for the form
	let label = $state('');
	let selectedPlace = $state<PlaceResult | null>(null);
	let isSubmitting = $state(false);

	// Derived from server data (updates automatically on form success)
	let savedAddresses = $derived(data.addresses);

	function handlePlaceSelect(place: PlaceResult) {
		selectedPlace = place;
		// Auto-fill label if empty
		if (!label) {
			if (place.main_text.toLowerCase().includes('home')) label = 'Home';
			else if (place.main_text.toLowerCase().includes('office')) label = 'Office';
		}
	}
</script>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8 flex items-center gap-4">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700"
		>
			<Icon icon="lucide:map-pin" width="24" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Saved Places</h1>
			<p class="text-sm text-gray-500">Manage your delivery locations</p>
		</div>
	</div>

	<div class="grid gap-8 lg:grid-cols-3">
		<div class="lg:col-span-1">
			<div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
				<h2 class="mb-4 text-lg font-semibold text-gray-900">Add New Place</h2>

				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							isSubmitting = false;
							if (result.type === 'success') {
								toast.success('Address saved');
								label = '';
								selectedPlace = null;
								update(); // Refreshes the list from server
							} else if (result.type === 'failure') {
								// Force string coercion to satisfy the type 'string | AnyComponent'
								const errorMsg =
									typeof result.data?.error === 'string'
										? result.data.error
										: 'Failed to save address';

								toast.error(errorMsg);
							}
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="place_id" value={selectedPlace?.place_id ?? ''} />
					<input type="hidden" name="main_text" value={selectedPlace?.main_text ?? ''} />
					<input type="hidden" name="secondary_text" value={selectedPlace?.secondary_text ?? ''} />
					<input type="hidden" name="lat" value={selectedPlace?.lat ?? ''} />
					<input type="hidden" name="lng" value={selectedPlace?.lng ?? ''} />

					<div>
						<label for="label" class="mb-1 block text-sm font-medium text-gray-700">Label</label>
						<input
							type="text"
							name="label"
							id="label"
							bind:value={label}
							placeholder="e.g. Home, Work, Mom's House"
							class="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
						/>
					</div>

					<div>
						<label for="address-search" class="mb-1 block text-sm font-medium text-gray-700">
							Address
						</label>

						<PlaceSearch id="address-search" onPlaceSelected={handlePlaceSelect} />

						{#if selectedPlace}
							<div class="mt-2 rounded-md bg-green-50 p-2 text-xs text-green-800">
								<span class="font-bold">Selected:</span>
								{selectedPlace.main_text}, {selectedPlace.secondary_text}
							</div>
						{/if}
					</div>

					<button
						type="submit"
						disabled={!label || !selectedPlace || isSubmitting}
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-900 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
					>
						{#if isSubmitting}
							<Icon icon="lucide:loader-2" class="animate-spin" />
							Saving...
						{:else}
							<Icon icon="lucide:plus" />
							Save Address
						{/if}
					</button>
				</form>
			</div>
		</div>

		<div class="lg:col-span-2">
			<div class="space-y-4">
				{#if savedAddresses.length === 0}
					<div
						class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center"
					>
						<div
							class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400"
						>
							<Icon icon="lucide:map-pin-off" width="24" />
						</div>
						<p class="text-gray-900 font-medium">No saved places</p>
						<p class="text-sm text-gray-500">Add your first address to speed up checkout</p>
					</div>
				{/if}

				{#each savedAddresses as addr (addr.id)}
					<div
						class="group relative flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-green-200 hover:shadow-md"
					>
						<div
							class="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600"
						>
							<Icon icon="lucide:map-pin" width="20" />
						</div>

						<div class="flex-1">
							<h3 class="font-bold text-gray-900">{addr.label}</h3>
							<p class="text-sm font-medium text-gray-800">{addr.place_name}</p>
							<p class="text-xs text-gray-500">{addr.address}</p>
						</div>

						<form
							method="POST"
							action="?/delete"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										toast.success('Address deleted');
										update();
									}
								};
							}}
						>
							<input type="hidden" name="id" value={addr.id} />
							<button
								type="submit"
								aria-label="Delete address"
								class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
							>
								<Icon icon="lucide:trash-2" width="18" />
							</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
