<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { searchPlaces } from '$lib/apis/places';
	import { sessionTokenManager } from '$lib/stores/sessionToken';
	import Icon from '@iconify/svelte';
	import type { PlaceResult } from '$lib/schemas/address';

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

	// Fallback modal state
	let fallbackOpen = $state(false);
	let fallbackData = $state({
		name: '',
		landmark: ''
	});

	// Derived state for validation
	let canSubmitFallback = $derived(fallbackData.name.trim().length > 0);

	// Cleanup on component destroy
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
			// Check again if query is still valid when timer fires
			const currentQuery = query.trim();
			if (!currentQuery) {
				results = [];
				isOpen = false;
				return;
			}

			isLoading = true;
			try {
				const sessionToken = sessionTokenManager.getGlobalToken();
				// Use currentQuery instead of query to avoid race conditions
				results = await searchPlaces(currentQuery, sessionToken, 10);

				// Final check: only show results if query hasn't changed
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
		if (!isOpen) return;

		const itemCount = results.length > 0 ? results.length : 1;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, itemCount - 1);
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
			case 'Escape':
				isOpen = false;
				selectedIndex = -1;
				break;
		}
	}

	async function selectPlace(place: PlaceResult) {
		query = place.main_text;
		isOpen = false;
		selectedIndex = -1;

		if (onPlaceSelected) {
			await tick(); // Wait for DOM updates
			onPlaceSelected(place);
		}
	}

	function handleBlur() {
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
		// Focus first input after modal opens
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
			id: Date.now(),
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

	// Handle Enter key in modal
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
		class="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-md {disabled
			? 'opacity-50 cursor-not-allowed'
			: ''}"
	>
		<Icon icon="lucide:map-pin" width="20" class="text-gray-400" />
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
			class="w-full border-none bg-transparent text-base placeholder-gray-500 focus:ring-0 focus:outline-none"
			aria-label={placeholder}
		/>
		{#if isLoading}
			<div class="text-xs text-gray-500" transition:fade={{ duration: 150 }}>Loading…</div>
		{/if}
	</div>

	<!-- Suggestions Dropdown -->
	{#if isOpen}
		<ul
			class="absolute top-full z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-white shadow-md"
			transition:slide={{ duration: 200 }}
		>
			{#if results.length > 0}
				{#each results as place, index (place.place_id || place.id || index)}
					<li
						class="cursor-pointer px-4 py-2 text-left transition-colors {selectedIndex === index
							? 'bg-gray-100'
							: 'hover:bg-gray-50'}"
						onmousedown={(e) => {
							e.preventDefault();
							selectPlace(place);
						}}
						onmouseenter={() => (selectedIndex = index)}
						role="option"
						aria-selected={selectedIndex === index ? 'true' : 'false'}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1 min-w-0">
								<div class="font-medium text-gray-900">{place.main_text || place.name}</div>
								{#if place.secondary_text}
									<div class="text-xs text-gray-500 truncate">{place.secondary_text}</div>
								{/if}
							</div>
							<span
								class="px-2 py-0.5 text-xs font-medium rounded {place.source === 'db'
									? 'bg-green-100 text-green-700'
									: 'bg-blue-100 text-blue-700'}"
							>
								{place.source === 'db' ? 'Saved' : 'Google'}
							</span>
						</div>
					</li>
				{/each}
			{:else}
				<li
					class="cursor-pointer px-4 py-2 text-gray-500 hover:bg-gray-100 transition-colors"
					onmousedown={(e) => {
						e.preventDefault();
						openFallbackModal();
					}}
					role="option"
					aria-selected="false"
				>
					Can't find that place? Click to specify
				</li>
			{/if}
		</ul>
	{/if}
</div>

<!-- Fallback Modal -->
{#if fallbackOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={closeFallbackModal}
		onkeydown={(e) => e.key === 'Escape' && closeFallbackModal()}
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			transition:slide={{ duration: 300 }}
			role="document"
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-semibold text-gray-900">Specify Location</h2>
				<button
					onclick={closeFallbackModal}
					class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
					aria-label="Close"
					type="button"
				>
					<Icon icon="lucide:x" width="20" />
				</button>
			</div>

			<!-- Form -->
			<form onsubmit={submitFallback} class="space-y-4">
				<div>
					<label for="place-name" class="block text-sm font-medium text-gray-700 mb-1">
						Hostel name <span class="text-red-500">*</span>
					</label>
					<input
						id="place-name"
						type="text"
						bind:value={fallbackData.name}
						onkeydown={handleModalKeydown}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						required
						aria-required="true"
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
						class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-2">
					<button
						onclick={closeFallbackModal}
						type="button"
						class="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!canSubmitFallback}
						class="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 font-medium text-white hover:from-purple-700 hover:to-purple-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						Continue
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
