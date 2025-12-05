<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	// Stores
	import { cartStore } from '$lib/stores/cart.svelte';
	import { deliveryStore, FREE_DELIVERY_THRESHOLD } from '$lib/stores/delivery.svelte';

	import { getImageUrl } from '$lib/utils/getImage'; // Adjust path
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	// --- State ---
	let showConfirm = $state(false);

	// --- Derived Calculations ---
	// We rely on the store's computed getters for the base numbers
	let subtotal = $derived(cartStore.totalPrice);
	let totalItems = $derived(cartStore.totalItems);

	// Delivery Logic
	let deliveryFee = $derived(deliveryStore.getDeliveryFee(subtotal));
	let totalPrice = $derived(subtotal + deliveryFee);
	let deliveryOption = $derived(deliveryStore.deliveryOption);

	// Free Delivery Logic
	let amountUntilFreeDelivery = $derived(Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal));
	let qualifiesForFreeDelivery = $derived(subtotal >= FREE_DELIVERY_THRESHOLD);
	let isDelivery = $derived(deliveryOption === 'delivery');

	// Show prompt if they are close (within 50 KES) but haven't reached it yet
	let showFreeDeliveryPrompt = $derived(
		isDelivery && !qualifiesForFreeDelivery && amountUntilFreeDelivery <= 50
	);

	// --- Actions ---

	function handleCheckout() {
		cartStore.closeCart();
		goto('/checkout');
	}

	function handleClearCart() {
		showConfirm = true;
	}

	function confirmClearCart() {
		cartStore.clearCart();
		showConfirm = false;
	}

	// Helper to format currency
	function formatPrice(amount: number) {
		return `KES ${amount.toFixed(2)}`;
	}
</script>

<!-- Backdrop -->
{#if cartStore.isOpen}
	<button
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm cursor-default border-0 transition-opacity duration-300"
		onclick={() => cartStore.closeCart()}
		aria-label="Close cart backdrop"
	></button>
{/if}

<!-- Cart Drawer -->
<div
	class="fixed inset-y-0 right-0 z-50 w-full max-w-sm transform shadow-2xl transition-transform duration-300 sm:max-w-md cart-drawer
    {cartStore.isOpen ? 'translate-x-0' : 'translate-x-full'}"
>
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="flex-shrink-0 border-b bg-white p-4 sm:p-5 cart-header">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold sm:text-2xl" style="color: var(--color-text-black);">
						Your Cart
					</h2>
					<p class="text-sm sm:text-base" style="color: var(--color-text-muted);">
						{totalItems}
						{totalItems === 1 ? 'item' : 'items'}
					</p>
				</div>
				<button
					onclick={() => cartStore.closeCart()}
					class="rounded-full p-2.5 transition hover:bg-gray-100"
					style="color: var(--color-text-muted);"
					aria-label="Close cart"
				>
					<Icon icon="lucide:x" class="h-5 w-5" />
				</button>
			</div>
		</div>

		<!-- Items Area -->
		<div class="flex-1 overflow-y-auto p-4 sm:p-5" style="background-color: var(--color-bg-1);">
			{#if cartStore.items.length === 0}
				<!-- Empty State -->
				<div class="flex h-full flex-col items-center justify-center text-center">
					<Icon
						icon="lucide:shopping-cart"
						class="mb-4 h-20 w-20"
						style="color: var(--color-border);"
					/>
					<p class="text-lg font-semibold" style="color: var(--color-text);">Your cart is empty</p>
					<p class="mt-2 text-sm" style="color: var(--color-text-muted);">
						Add some delicious items to get started!
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Free Delivery Prompt -->
					{#if showFreeDeliveryPrompt}
						<div
							class="rounded-xl border p-4 shadow-sm"
							style="background: linear-gradient(135deg, var(--color-theme-light) 0%, #fff9f7 100%); border-color: var(--color-theme-1);"
						>
							<div class="flex items-start gap-3">
								<div class="rounded-lg p-2" style="background-color: white;">
									<Icon icon="lucide:truck" class="h-5 w-5" style="color: var(--color-theme-1);" />
								</div>
								<div class="flex-1">
									<p class="text-sm font-bold" style="color: var(--color-text-black);">
										Almost there!
									</p>
									<p class="mt-1 text-xs" style="color: var(--color-text);">
										Add <span class="font-bold" style="color: var(--color-theme-2);"
											>{formatPrice(amountUntilFreeDelivery)}</span
										> more for free delivery
									</p>
									<!-- Progress Bar -->
									<div
										class="mt-3 h-2 w-full rounded-full"
										style="background-color: var(--color-bg-0);"
									>
										<div
											class="h-full rounded-full transition-all duration-500"
											style="width: {Math.min(
												(subtotal / FREE_DELIVERY_THRESHOLD) * 100,
												100
											)}%; background: linear-gradient(90deg, var(--color-theme-1) 0%, var(--color-theme-2) 100%);"
										></div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Cart Items Loop -->
					{#each cartStore.items as item (item.cartItemId)}
						{@const imageUrl = getImageUrl(item.image)}
						<div
							class="overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
							style="border: 1px solid var(--color-border-light);"
						>
							<div class="flex gap-3 p-3 sm:p-4">
								{#if imageUrl}
									<div class="relative flex-shrink-0">
										<img
											src={imageUrl}
											alt={item.name}
											class="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
											style="border: 2px solid var(--color-bg-2);"
										/>
									</div>
								{/if}
								<div class="flex min-w-0 flex-1 flex-col justify-between">
									<div>
										<h3 class="product-name leading-tight sm:text-base">
											{item.name}
										</h3>

										<span
											class="mt-2 inline-block font-normal sm:text-base"
											style="color: var(--color-text-black);"
										>
											{formatPrice(item.price)}
										</span>
									</div>

									<!-- Quantity Controls -->
									<div class="mt-3 flex items-center justify-between">
										<div
											class="flex items-center gap-2 rounded-lg p-1"
											style="background-color: var(--color-bg-1); border: 1px solid var(--color-border-light);"
										>
											<button
												onclick={() => cartStore.updateQuantity(item.cartItemId, item.quantity - 1)}
												class="rounded-md p-1.5 transition hover:bg-white"
												aria-label="Decrease quantity"
											>
												<Icon
													icon="lucide:minus"
													class="h-4 w-4"
													style="color: var(--color-text-black);"
												/>
											</button>
											<span
												class="w-8 text-center text-sm font-bold"
												style="color: var(--color-text-black);"
											>
												{item.quantity}
											</span>
											<button
												onclick={() => cartStore.updateQuantity(item.cartItemId, item.quantity + 1)}
												class="rounded-md p-1.5 transition hover:bg-white"
												aria-label="Increase quantity"
											>
												<Icon
													icon="lucide:plus"
													class="h-4 w-4"
													style="color: var(--color-text-black);"
												/>
											</button>
										</div>

										<button
											onclick={() => cartStore.removeItem(item.cartItemId)}
											class="cart-delete-button rounded-lg p-2 transition"
											aria-label="Remove item"
										>
											<Icon icon="lucide:trash-2" class="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer / Checkout Area -->
		{#if cartStore.items.length > 0}
			<div
				class="flex-shrink-0 border-t bg-white p-4 shadow-lg sm:p-5"
				style="border-color: var(--color-border);"
			>
				<!-- Success Badge -->
				{#if isDelivery && qualifiesForFreeDelivery}
					<div
						class="mb-4 rounded-xl p-3"
						style="background: linear-gradient(135deg, var(--color-success-bg) 0%, #f4f9f0 100%); border: 1px solid var(--color-success);"
					>
						<p
							class="flex items-center gap-2 text-sm font-bold"
							style="color: var(--color-success);"
						>
							<span class="text-xl">🎉</span>
							You've unlocked free delivery!
						</p>
					</div>
				{/if}

				<!-- Totals -->
				<div class="mb-4 space-y-3 rounded-xl p-4" style="background-color: var(--color-bg-1);">
					<div class="flex justify-between text-sm">
						<span style="color: var(--color-text-muted);">Subtotal</span>
						<span class="font-semibold" style="color: var(--color-text-black);"
							>{formatPrice(subtotal)}</span
						>
					</div>
					<div class="flex justify-between text-sm">
						<span style="color: var(--color-text-muted);">Delivery</span>
						<span
							class="font-semibold"
							style="color: {deliveryFee === 0
								? 'var(--color-success)'
								: 'var(--color-text-black)'};"
						>
							{deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
						</span>
					</div>
					<div
						class="flex justify-between border-t pt-3"
						style="border-color: var(--color-border);"
					>
						<span class="text-base font-bold" style="color: var(--color-text-black);">Total</span>
						<span class="text-xl font-bold" style="color: var(--color-text-black);">
							{formatPrice(totalPrice)}
						</span>
					</div>
				</div>

				<!-- Actions -->
				<button
					onclick={handleCheckout}
					class="cart-checkout-button mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-lg transition hover:shadow-xl sm:py-4"
				>
					Proceed to Checkout
					<Icon icon="lucide:arrow-right" class="h-5 w-5" />
				</button>

				<button
					onclick={handleClearCart}
					class="cart-clear-button cursor-pointer w-full rounded-lg py-2 text-sm font-medium transition"
				>
					Clear Cart
				</button>

				<!-- Confirm Modal Wrapper -->
				<ConfirmModal
					show={showConfirm}
					message="Are you sure you want to clear your cart?"
					onConfirm={confirmClearCart}
					onCancel={() => (showConfirm = false)}
				/>
			</div>
		{/if}
	</div>
</div>
