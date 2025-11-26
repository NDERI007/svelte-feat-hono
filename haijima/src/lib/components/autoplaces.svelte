<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { searchPlaces } from '$lib/apis/places'; // Ensure this path exists
	import { sessionTokenManager } from '$lib/stores/sessionToken'; // Ensure this path exists
	import Icon from '@iconify/svelte';
	import type { PlaceResult } from '$lib/schemas/address'; // Ensure types exist

	interface Props {
		onPlaceSelected?: (place: PlaceResult) => void;
		placeholder?: string;
		disabled?: boolean;
	}

	let {
		onPlaceSelected,
		placeholder = 'Enter delivery address',
		disabled = false
	}: Props = $props();

	let query = $state('');
	let results = $state<PlaceResult[]>([]);
	let isLoading = $state(false);
	let selectedIndex = $state(-1);
	let isOpen = $state(false);
	let inputElement: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Fallback modal state (Internal to this component)
	let fallbackOpen = $state(false);
	let fallbackData = $state({
		name: '',
		landmark: ''
	});

	let canSubmitFallback = $derived(fallbackData.name.trim().length > 0);

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});

	async function handleInput() {
		clearTimeout(debounceTimer);

		if (!query.trim()) {
			results = [];
			isOpen = false;
			return;
		}

		debounceTimer = setTimeout(async () => {
			const currentQuery = query.trim();
			if (!currentQuery) {
				results = [];
				isOpen = false;
				return;
			}

			isLoading = true;
			try {
				const sessionToken = sessionTokenManager.getGlobalToken();
				results = await searchPlaces(currentQuery, sessionToken, 10);

				if (query.trim() === currentQuery) {
					isOpen = true;
					selectedIndex = -1;
				}
			} catch (error) {
				console.error('Search error:', error);
				results = [];
				isOpen = true;
			} finally {
				isLoading = false;
			}
		}, 300);
	}

	function handleKeydown(event: KeyboardEvent) {
		// Allow closing with escape even if not open (to blur)
		if (event.key === 'Escape') {
			isOpen = false;
			selectedIndex = -1;
			inputElement?.blur();
			return;
		}

		if (!isOpen) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (results.length === 0) {
					openFallbackModal();
				} else if (selectedIndex >= 0 && selectedIndex < results.length) {
					selectPlace(results[selectedIndex]);
				}
				break;
		}
	}

	async function selectPlace(place: PlaceResult) {
		query = place.main_text;
		isOpen = false;
		selectedIndex = -1;

		if (onPlaceSelected) {
			await tick();
			onPlaceSelected(place);
		}
	}

	function handleBlur() {
		// Delay closing to allow click events on dropdown items to fire
		setTimeout(() => {
			isOpen = false;
			selectedIndex = -1;
		}, 200);
	}

	function handleFocus() {
		if (query.trim() && results.length > 0) {
			isOpen = true;
		}
	}

	async function openFallbackModal() {
		fallbackOpen = true;
		isOpen = false;
		await tick();
		document.getElementById('place-name')?.focus();
	}

	function closeFallbackModal() {
		fallbackOpen = false;
		fallbackData = { name: '', landmark: '' };
	}

	async function submitFallback(event?: SubmitEvent) {
		event?.preventDefault();
		if (!canSubmitFallback) return;

		const customPlace: PlaceResult = {
			source: 'db',
			id: Date.now(), // Temp ID
			place_id: null,
			main_text: fallbackData.name,
			secondary_text: fallbackData.landmark || null,
			lat: null,
			lng: null
		};

		if (onPlaceSelected) {
			await tick();
			onPlaceSelected(customPlace);
		}

		query = fallbackData.name;
		closeFallbackModal();
	}

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && canSubmitFallback) {
			submitFallback();
		} else if (event.key === 'Escape') {
			closeFallbackModal();
		}
	}
</script>

<div class="relative w-full">
	<!-- Search Input -->
	<div
		class="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent {disabled
			? 'opacity-50 cursor-not-allowed'
			: ''}"
	>
		<!-- Replaced Search icon with MapPin to match your design, or keep Search -->
		<input
			bind:this={inputElement}
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={handleFocus}
			type="text"
			{placeholder}
			{disabled}
			autocomplete="off"
			class="w-full border-none bg-transparent text-base placeholder-gray-400 focus:ring-0 focus:outline-none"
			aria-label={placeholder}
		/>

		{#if isLoading}
			<Icon icon="lucide:loader-2" class="animate-spin text-gray-400" />
		{:else}
			<Icon icon="lucide:search" class="text-gray-400" />
		{/if}
	</div>

	<!-- Suggestions Dropdown -->
	{#if isOpen}
		<ul
			class="absolute top-full z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-gray-100 bg-white shadow-lg"
			transition:slide={{ duration: 200 }}
		>
			{#if results.length > 0}
				{#each results as place, index (place.place_id || place.id || index)}
					<li
						class="cursor-pointer px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-none {selectedIndex ===
						index
							? 'bg-gray-50'
							: 'hover:bg-gray-50'}"
						onmousedown={(e) => {
							e.preventDefault(); // Prevent input blur
							selectPlace(place);
						}}
						onmouseenter={() => (selectedIndex = index)}
						role="option"
						aria-selected={selectedIndex === index}
					>
						<div class="flex items-start gap-3">
							<Icon icon="lucide:map-pin" class="mt-1 text-gray-400 shrink-0" />
							<div class="flex-1 min-w-0">
								<div class="font-medium text-gray-900">{place.main_text || place.name}</div>
								{#if place.secondary_text}
									<div class="text-sm text-gray-500 truncate">{place.secondary_text}</div>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			{:else if !isLoading && query.length >= 2}
				<!-- No Results / Fallback Trigger inside dropdown -->
				<li
					class="cursor-pointer px-4 py-3 text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-2"
					onmousedown={(e) => {
						e.preventDefault();
						openFallbackModal();
					}}
					role="option"
					aria-selected="false"
				>
					<Icon icon="lucide:edit-3" class="text-green-600" />
					<div>
						<p class="font-medium text-green-600">Can't find that place?</p>
						<p class="text-xs">Enter it manually</p>
					</div>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<!-- Internal Fallback Modal -->
{#if fallbackOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 outline-none"
		onclick={(e) => {
			// Check if the click is on the backdrop itself, not the child
			if (e.target === e.currentTarget) closeFallbackModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeFallbackModal();
		}}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
			transition:fade={{ duration: 200 }}
			role="document"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-900">Specify Location</h2>
				<button onclick={closeFallbackModal} class="rounded-full p-1 hover:bg-gray-100">
					<Icon icon="lucide:x" width="20" />
				</button>
			</div>

			<form onsubmit={submitFallback} class="space-y-4">
				<div>
					<label for="place-name" class="block text-sm font-medium text-gray-700 mb-1">
						Location Name <span class="text-red-500">*</span>
					</label>
					<input
						id="place-name"
						type="text"
						bind:value={fallbackData.name}
						onkeydown={handleModalKeydown}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
						required
					/>
				</div>
				<div>
					<label for="landmark" class="block text-sm font-medium text-gray-700 mb-1">
						Landmark (Optional)
					</label>
					<input
						id="landmark"
						type="text"
						bind:value={fallbackData.landmark}
						onkeydown={handleModalKeydown}
						placeholder="e.g., Near Rubis station"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
					/>
				</div>
				<div class="flex gap-3 pt-2">
					<button
						onclick={closeFallbackModal}
						type="button"
						class="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!canSubmitFallback}
						class="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
					>
						Continue
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
