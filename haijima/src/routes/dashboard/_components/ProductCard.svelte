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
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			transition:fade={{ duration: 200 }}
			onclick={closeModal}
			aria-hidden="true"
		></div>

		<!-- Modal Content -->
		<div
			class="relative z-10 flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
			style="background-color: var(--color-bg-0);"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<!-- Header -->
			<div
				class="sticky top-0 z-10 flex items-center justify-between p-4"
				style="border-bottom: 1px solid var(--color-border); background-color: var(--color-bg-0);"
			>
				<h2 class="truncate pr-4" style="color: var(--color-text);">
					{product.name}
				</h2>
				<button
					onclick={closeModal}
					class="rounded-full p-1 transition-colors"
					style="color: var(--color-text);"
					onmouseenter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-2)')}
					onmouseleave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
				>
					<Icon icon="lucide:x" class="h-5 w-5" />
				</button>
			</div>

			<!-- Scrollable Body -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-6 prose prose-sm sm:prose max-w-none">
				{#if isLoadingVariants}
					<div
						class="flex flex-col items-center justify-center py-12 gap-2 not-prose"
						style="color: var(--color-text);"
					>
						<Icon
							icon="lucide:loader-2"
							class="h-8 w-8 animate-spin"
							style="color: var(--color-theme-1);"
						/>
						<span>Loading options...</span>
					</div>
				{:else}
					<div class="mb-6 not-prose">
						{@render productImage(true)}
					</div>

					{#if !hasDirectPrice && hasVariants}
						<div class="mb-6 space-y-3 not-prose">
							<span class="text-sm font-medium" style="color: var(--color-text);">Select Size</span>
							<div class="flex flex-wrap gap-2">
								{#each variants as variant}
									<button
										onclick={() => (selectedVariant = variant)}
										disabled={!variant.is_available}
										class="relative rounded-lg px-4 py-2 text-sm font-medium transition border
                                        {selectedVariant?.id === variant.id
											? 'shadow-md'
											: variant.is_available
												? ''
												: 'cursor-not-allowed line-through'}"
										style={selectedVariant?.id === variant.id
											? `background-color: var(--color-theme-1); color: white; border-color: var(--color-theme-1);`
											: variant.is_available
												? `background-color: var(--color-bg-0); color: var(--color-text); border-color: var(--color-border);`
												: `background-color: var(--color-bg-2); color: var(--color-text-lighter); border-color: var(--color-border-light);`}
										onmouseenter={(e) => {
											if (variant.is_available && selectedVariant?.id !== variant.id) {
												e.currentTarget.style.borderColor = 'var(--color-theme-1)';
												e.currentTarget.style.backgroundColor = 'var(--color-theme-light)';
											}
										}}
										onmouseleave={(e) => {
											if (variant.is_available && selectedVariant?.id !== variant.id) {
												e.currentTarget.style.borderColor = 'var(--color-border)';
												e.currentTarget.style.backgroundColor = 'var(--color-bg-0)';
											}
										}}
									>
										{variant.size_name}
									</button>
								{/each}
							</div>
							<p class="text-sm" style="color: var(--color-text);">
								Price: <span class="font-bold" style="color: var(--color-text);"
									>KES {currentPrice.toFixed(2)}</span
								>
							</p>
						</div>
					{/if}

					<div
						class="mb-6 rounded-xl p-4 space-y-4 not-prose"
						style="background-color: var(--color-bg-1); border: 1px solid var(--color-border);"
					>
						<div class="flex items-center justify-between">
							<span class="font-medium" style="color: var(--color-text);">Quantity</span>
							<QuantitySelector bind:quantity />
						</div>
						<div
							class="flex items-center justify-between pt-3"
							style="border-top: 1px solid var(--color-border);"
						>
							<span style="color: var(--color-text);">Subtotal</span>
							<span class="text-xl font-bold" style="color: var(--color-theme-1);"
								>KES {subtotal.toFixed(2)}</span
							>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="p-4 flex gap-3"
				style="border-top: 1px solid var(--color-border); background-color: var(--color-bg-0);"
			>
				<button
					onclick={handleAdd}
					disabled={isLoadingVariants || (!hasDirectPrice && !selectedVariant)}
					class="flex-1 rounded-lg py-3 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					style="background-color: var(--color-theme-1); color: white;"
					onmouseenter={(e) =>
						!e.currentTarget.disabled &&
						(e.currentTarget.style.backgroundColor = 'var(--color-theme-2)')}
					onmouseleave={(e) =>
						!e.currentTarget.disabled &&
						(e.currentTarget.style.backgroundColor = 'var(--color-theme-1)')}
				>
					{!hasDirectPrice && !selectedVariant ? 'Select an Option' : 'Add to Cart'}
				</button>
				<button
					onclick={closeModal}
					class="rounded-lg px-6 font-medium transition-all"
					style="border: 1px solid var(--color-border); color: var(--color-text); background-color: var(--color-bg-0);"
					onmouseenter={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-theme-1)';
						e.currentTarget.style.color = 'var(--color-theme-1)';
						e.currentTarget.style.backgroundColor = 'var(--color-theme-light)';
					}}
					onmouseleave={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-border)';
						e.currentTarget.style.color = 'var(--color-text)';
						e.currentTarget.style.backgroundColor = 'var(--color-bg-0)';
					}}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
