<script lang="ts">
	import Icon from '@iconify/svelte';
	import { cartStore } from '$lib/stores/cart.svelte';
	import QuantitySelector from './QuantitySelector.svelte';
	import type { MenuItem, ProductVariant, ImageVariants } from '$lib/schemas/menu';
	import { getLiveVariants } from '$lib/apis/live-product.svelte';

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

	function onDialogClose() {
		quantity = 1;
		selectedVariant = null;
	}

	function handleAdd() {
		if (!hasDirectPrice && !selectedVariant) return;
		cartStore.addItem(product, quantity, selectedVariant ?? undefined);
		closeModal();
	}
</script>

<!-- IMAGE LOGIC SNIPPET -->
{#snippet productImage(isModal = false)}
	{@const imgClass = isModal
		? 'h-48 w-48 rounded-xl object-cover sm:h-56 sm:w-56 mx-auto'
		: 'h-full w-full object-cover transition-all duration-500 group-hover:scale-105'}

	{#if !imgError && imageData?.lqip}
		<div
			class="absolute inset-0 bg-cover bg-center transition-opacity duration-500 {imgLoaded
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
			<div class="flex h-full items-center justify-center text-gray-400 bg-gray-100 rounded-2xl">
				<Icon icon="lucide:image-off" width="32" height="32" />
			</div>
		{/if}
	</div>
{/snippet}

<!-- CARD VIEW -->
<button
	class="group w-full text-left {product.available ? 'cursor-pointer' : 'cursor-not-allowed'}"
	onclick={openModal}
	disabled={!product.available}
>
	<div class="relative mb-3 aspect-square overflow-hidden rounded-2xl bg-gray-100">
		{@render productImage(false)}

		<!-- Overlays -->
		{#if !product.available}
			<div class="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
				<!-- FIX 2: Moved classes directly here, removed @apply -->
				<span class="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-900">
					Unavailable
				</span>
			</div>
		{:else}
			<div
				class="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 group-hover:scale-110 active:scale-95 z-10"
			>
				<Icon icon="lucide:plus" class="h-5 w-5 text-green-600" />
			</div>
		{/if}
	</div>

	<div class="space-y-1 text-center">
		<h3 class="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</h3>
		<p class="text-base font-bold text-green-600">{displayPrice}</p>
	</div>
</button>

<!-- MODAL -->
<dialog
	bind:this={dialogRef}
	onclose={onDialogClose}
	onclick={(e) => e.target === dialogRef && closeModal()}
	class="backdrop:bg-black/50 backdrop:backdrop-blur-sm m-auto w-full max-w-lg rounded-2xl p-0 shadow-2xl outline-none"
>
	<div class="flex flex-col max-h-[90vh] overflow-hidden bg-white">
		<div
			class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-4"
		>
			<h2 class="text-lg font-semibold text-gray-900 truncate pr-4">{product.name}</h2>
			<button onclick={closeModal} class="rounded-full p-1 hover:bg-gray-100">
				<Icon icon="lucide:x" class="h-5 w-5 text-gray-500" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 sm:p-6">
			{#if isLoadingVariants}
				<div class="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
					<Icon icon="lucide:loader-2" class="h-8 w-8 animate-spin text-green-600" />
					<span>Loading options...</span>
				</div>
			{:else}
				<div class="mb-6">
					{@render productImage(true)}
				</div>

				{#if !hasDirectPrice && hasVariants}
					<div class="mb-6 space-y-3">
						<span class="text-sm font-medium text-gray-700">Select Size</span>
						<div class="flex flex-wrap gap-2">
							{#each variants as variant}
								<button
									onclick={() => (selectedVariant = variant)}
									disabled={!variant.is_available}
									class="relative rounded-lg px-4 py-2 text-sm font-medium transition border
                                    {selectedVariant?.id === variant.id
										? 'bg-green-600 text-white border-green-600 shadow-md'
										: variant.is_available
											? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
											: 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed line-through'}"
								>
									{variant.size_name}
								</button>
							{/each}
						</div>
						<p class="text-sm text-gray-600">
							Price: <span class="font-bold text-green-600">KES {currentPrice.toFixed(2)}</span>
						</p>
					</div>
				{/if}

				<div class="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
					<div class="flex items-center justify-between">
						<span class="font-medium text-gray-700">Quantity</span>
						<QuantitySelector bind:quantity />
					</div>
					<div class="flex items-center justify-between border-t border-gray-200 pt-3">
						<span class="text-gray-600">Subtotal</span>
						<span class="text-xl font-bold text-green-600">KES {subtotal.toFixed(2)}</span>
					</div>
				</div>
			{/if}
		</div>

		<div class="p-4 border-t border-gray-100 bg-white flex gap-3">
			<button
				onclick={handleAdd}
				disabled={isLoadingVariants || (!hasDirectPrice && !selectedVariant)}
				class="flex-1 rounded-lg bg-green-600 py-3 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{!hasDirectPrice && !selectedVariant ? 'Select an Option' : 'Add to Cart'}
			</button>
			<button
				onclick={closeModal}
				class="rounded-lg border border-gray-300 px-6 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
			>
				Cancel
			</button>
		</div>
	</div>
</dialog>

<style>
	/* Native Dialog Animations */
	dialog[open] {
		animation: zoom-in 0.2s ease-out;
	}

	/* Backdrop Animation */
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		animation: fade-in 0.2s ease-out;
	}

	@keyframes zoom-in {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
