<script lang="ts">
	import Icon from '@iconify/svelte';
	import { cartStore } from '$lib/stores/cart.svelte';
	import QuantitySelector from './QuantitySelector.svelte';
	import type { MenuItem, ProductVariant, ImageVariants } from '$lib/schemas/menu';
	import { getLiveVariants } from '$lib/apis/live-product.svelte';
	import { fade, scale } from 'svelte/transition';

	let { product } = $props<{ product: MenuItem }>();

	// --- State ---
	let isOpen = $state(false);
	let dialogRef = $state<HTMLDialogElement>();
	let quantity = $state(1);
	let selectedVariant = $state<ProductVariant | null>(null);

	let imgLoaded = $state(false);
	let imgError = $state(false);

	const variantsQuery = getLiveVariants(() => (isOpen ? product.id : undefined));

	const variants = $derived(variantsQuery.data);
	const isLoadingVariants = $derived(variantsQuery.isLoading);

	// --- Derived State ---
	const hasDirectPrice = $derived(product.price !== null && product.price !== undefined);
	const hasVariants = $derived(variants.length > 0);

	const imageData = $derived(product.image as ImageVariants | null);
	const hasImageVariants = $derived(imageData?.variants?.avif && imageData?.variants?.jpg);

	const currentPrice = $derived.by(() => {
		if (selectedVariant) return selectedVariant.price;
		if (hasDirectPrice) return product.price;
		if (hasVariants) return variants.find((v) => v.is_available)?.price ?? 0;
		return 0;
	});

	const subtotal = $derived(currentPrice * quantity);

	const displayPrice = $derived.by(() => {
		if (hasDirectPrice) return `KES ${product.price.toFixed(2)}`;

		// FIX 1: Explicitly check variants existence and type the callback
		if (product.variants && product.variants.length > 0) {
			// We manually import the type in the script tag, but here we can just let TS infer
			// or force it if your TS config is very strict:
			const prices = product.variants.map((v: ProductVariant) => v.price);
			const min = Math.min(...prices);
			return `From KES ${min.toFixed(2)}`;
		}
		return '';
	});

	// --- Actions ---

	async function openModal() {
		if (!product.available) return;
		isOpen = true; // <--- Setting this to true automatically triggers the hook above!

		dialogRef?.showModal();
	}

	function closeModal() {
		isOpen = false;
		dialogRef?.close();
	}

	function handleAdd() {
		if (!hasDirectPrice && !selectedVariant) return;
		cartStore.addItem(product, quantity, selectedVariant ?? undefined);
		closeModal();
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeModal()} />

{#snippet productImage(isModal = false)}
	{@const imgClass = isModal
		? 'h-48 w-48 rounded-xl object-cover sm:h-56 sm:w-56 mx-auto'
		: 'h-full w-full object-cover transition-all duration-500 group-hover:scale-105'}

	{#if !imgError && imageData?.lqip}
		<div
			class="absolute inset-0 bg-cover bg-center transition-opacity duration-500 pointer-events-none {imgLoaded
				? 'opacity-0'
				: 'opacity-100'}"
			style="background-image: url({imageData.lqip}); filter: blur(10px); transform: scale(1.1);"
			aria-hidden="true"
		></div>
	{/if}

	<div class="relative {product.available ? '' : 'grayscale'}">
		{#if !imgError}
			{#if hasImageVariants && imageData}
				<picture>
					<source
						srcset="{imageData.variants.avif[400]} 400w, {imageData.variants.avif[800]} 800w"
						type="image/avif"
						sizes="(max-width: 640px) 50vw, 300px"
					/>
					<source
						srcset="{imageData.variants.jpg[400]} 400w, {imageData.variants.jpg[800]} 800w"
						type="image/jpeg"
						sizes="(max-width: 640px) 50vw, 300px"
					/>
					<img
						src={imageData.variants.jpg[400]}
						alt={product.name}
						loading="lazy"
						onload={() => (imgLoaded = true)}
						onerror={() => (imgError = true)}
						class="{imgClass} {imgLoaded ? 'opacity-100' : 'opacity-0'}"
					/>
				</picture>
			{:else}
				<img
					src={typeof product.image === 'string' ? product.image : ''}
					alt={product.name}
					loading="lazy"
					onload={() => (imgLoaded = true)}
					onerror={() => (imgError = true)}
					class="{imgClass} {imgLoaded ? 'opacity-100' : 'opacity-0'}"
				/>
			{/if}
		{:else}
			<div
				class="flex h-full items-center justify-center rounded-2xl"
				style="background-color: var(--color-bg-2); color: var(--color-text-lighter);"
			>
				<Icon icon="lucide:image-off" width="32" height="32" />
			</div>
		{/if}
	</div>
{/snippet}

<!-- 
    1. THE CARD BUTTON 
-->
<button
	type="button"
	class="group w-full text-left {product.available
		? 'cursor-pointer'
		: 'cursor-not-allowed'} outline-none"
	onclick={openModal}
	disabled={!product.available}
	style="color: var(--color-text);"
>
	<div
		class="relative mb-3 aspect-square overflow-hidden rounded-2xl"
		style="background-color: var(--color-bg-0);"
	>
		{@render productImage(false)}
		{#if !product.available}
			<div class="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
				<span
					class="rounded-full px-4 py-1.5 text-sm font-medium"
					style="background-color: var(--color-bg-0); color: var(--color-text);"
				>
					Unavailable
				</span>
			</div>
		{:else}
			<div
				class="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 group-hover:scale-110 active:scale-95 z-10"
				style="background-color: var(--color-bg-0);"
			>
				<Icon icon="lucide:plus" class="h-5 w-5" style="color: var(--color-theme-1);" />
			</div>
		{/if}
	</div>
	<div class="space-y-1 text-left">
		<h3 class="line-clamp-2 product-name">
			{product.name}
		</h3>
		<p class="price-text">{displayPrice}</p>
	</div>
</button>

<!-- CUSTOM MODAL -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
		role="dialog"
		aria-modal="true"
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/40 backdrop-blur-md"
			transition:fade={{ duration: 200 }}
			onclick={closeModal}
			aria-hidden="true"
		></div>

		<!-- Modal Content -->
		<div
			class="relative z-10 flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden modal-container"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-5 modal-header">
				<h2 class="product-name-lg truncate pr-4">
					{product.name}
				</h2>
				<button onclick={closeModal} class="modal-close-btn" aria-label="Close modal">
					<Icon icon="lucide:x" class="h-5 w-5" />
				</button>
			</div>

			<!-- Scrollable Body -->
			<div class="flex-1 overflow-y-auto px-6 pb-6">
				{#if isLoadingVariants}
					<div class="flex flex-col items-center justify-center py-16 gap-3">
						<Icon
							icon="lucide:loader-2"
							class="h-10 w-10 animate-spin"
							style="color: var(--color-theme-1);"
						/>
						<span class="text-sm font-medium" style="color: var(--color-text-muted);"
							>Loading options...</span
						>
					</div>
				{:else}
					<!-- Product Image -->
					<div class="mb-8">
						{@render productImage(true)}
					</div>

					<!-- Size Selection -->
					{#if !hasDirectPrice && hasVariants}
						<div class="mb-8">
							<span class="block text-sm font-semibold mb-3" style="color: var(--color-text);">
								Size
							</span>
							<div class="flex flex-wrap gap-2 mb-6">
								{#each variants as variant}
									<button
										onclick={() => (selectedVariant = variant)}
										disabled={!variant.is_available}
										class="modal-size-btn"
										data-available={variant.is_available}
										data-selected={selectedVariant?.id === variant.id}
									>
										{variant.size_name}
										{#if !variant.is_available}
											<span class="modal-unavailable-badge">✕</span>
										{/if}
									</button>
								{/each}
							</div>

							<!-- Price Display -->
							<div class="flex items-baseline gap-2">
								<span
									class="text-xs font-medium uppercase tracking-wide"
									style="color: var(--color-text-muted);"
								>
									Price
								</span>
								<span class="text-2xl font-bold price-text" style="color: var(--color-text);">
									KES {currentPrice.toFixed(2)}
								</span>
							</div>
						</div>

						<!-- Divider -->
						<div class="modal-divider mb-8"></div>
					{/if}

					<!-- Quantity -->
					<div class="mb-8">
						<QuantitySelector bind:quantity />
					</div>

					<!-- Divider -->
					<div class="modal-divider mb-6"></div>

					<!-- Subtotal -->
					<div class="flex items-baseline justify-between">
						<span
							class="text-sm font-semibold uppercase tracking-wide"
							style="color: var(--color-text-muted);"
						>
							Subtotal
						</span>
						<span class="text-3xl font-bold price-text">
							KES {subtotal.toFixed(2)}
						</span>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 pb-6 pt-4 flex gap-3 modal-footer">
				<button
					onclick={handleAdd}
					disabled={isLoadingVariants || (!hasDirectPrice && !selectedVariant)}
					class="flex-1 btn-primary modal-add-btn"
				>
					{!hasDirectPrice && !selectedVariant ? 'Select Size First' : 'Add to Cart'}
				</button>
				<button onclick={closeModal} class="modal-cancel-btn"> Cancel </button>
			</div>
		</div>
	</div>
{/if}
