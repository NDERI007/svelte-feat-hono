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
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm cursor-default border-0"
		onclick={() => cartStore.closeCart()}
		aria-label="Close cart backdrop"
	></button>
{/if}

<!-- Drawer Panel -->
<div
	class="fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-white shadow-xl transition-transform duration-300 sm:max-w-md
    {cartStore.isOpen ? 'translate-x-0' : 'translate-x-full'}"
>
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="flex-shrink-0 border-b border-gray-200 bg-white p-3 sm:p-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-bold text-gray-900 sm:text-xl">Your Cart</h2>
					<p class="text-xs text-gray-500 sm:text-sm">
						{totalItems}
						{totalItems === 1 ? 'item' : 'items'}
					</p>
				</div>
				<button
					onclick={() => cartStore.closeCart()}
					class="rounded-full p-2 transition hover:bg-gray-100"
					aria-label="Close cart"
				>
					<Icon icon="lucide:x" class="h-5 w-5 text-gray-600" />
				</button>
			</div>
		</div>

		<!-- Items Area -->
		<div class="flex-1 overflow-y-auto bg-[#fefaef] p-3 sm:p-4">
			{#if cartStore.items.length === 0}
				<!-- Empty State -->
				<div class="flex h-full flex-col items-center justify-center text-center">
					<Icon icon="lucide:shopping-cart" class="mb-4 h-16 w-16 text-gray-300" />
					<p class="text-lg font-medium text-gray-600">Your cart is empty</p>
					<p class="mt-2 text-sm text-gray-500">Add some delicious items to get started!</p>
				</div>
			{:else}
				<div class="space-y-3">
					<!-- Free Delivery Prompt -->
					{#if showFreeDeliveryPrompt}
						<div class="rounded-lg border-2 border-amber-300 bg-amber-50 p-2.5 shadow-sm sm:p-3">
							<div class="flex items-start gap-2">
								<Icon
									icon="lucide:truck"
									class="h-4 w-4 flex-shrink-0 text-amber-600 sm:h-5 sm:w-5"
								/>
								<div class="flex-1">
									<p class="text-xs font-semibold text-amber-900 sm:text-sm">Almost there!</p>
									<p class="text-xs text-amber-800">
										Add <span class="font-bold">{formatPrice(amountUntilFreeDelivery)}</span> more for
										free delivery
									</p>
									<!-- Progress Bar -->
									<div class="mt-2 h-1.5 w-full rounded-full bg-amber-200">
										<div
											class="h-full rounded-full bg-amber-500 transition-all duration-300"
											style="width: {Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%"
										></div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Cart Items Loop -->
					{#each cartStore.items as item (item.cartItemId)}
						{@const imageUrl = getImageUrl(item.image)}
						<div class="overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md">
							<div class="flex gap-2 p-2.5 sm:gap-3 sm:p-3">
								{#if imageUrl}
									<img
										src={imageUrl}
										alt={item.name}
										class="h-20 w-20 flex-shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
									/>
								{/if}
								<div class="flex min-w-0 flex-1 flex-col">
									<h3 class="text-sm font-semibold text-gray-900 sm:text-base">
										{item.name}
									</h3>

									<!-- Price & Delete Row -->
									<div class="mt-auto flex items-center justify-between pt-2">
										<span class="text-base font-bold text-green-600 sm:text-lg">
											{formatPrice(item.price)}
										</span>
										<button
											onclick={() => cartStore.removeItem(item.cartItemId)}
											class="text-red-500 transition hover:text-red-600"
											aria-label="Remove item"
										>
											<Icon icon="lucide:trash-2" class="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>

							<!-- Quantity Footer -->
							<div class="border-t border-gray-100 bg-gray-50 px-2.5 py-2 sm:px-3">
								<div class="flex items-center justify-between">
									<span class="text-xs text-gray-600 sm:text-sm"> Quantity </span>
									<div class="flex items-center gap-2 sm:gap-3">
										<button
											onclick={() => cartStore.updateQuantity(item.cartItemId, item.quantity - 1)}
											class="rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 sm:p-1.5"
											aria-label="Decrease quantity"
										>
											<Icon icon="lucide:minus" class="h-3 w-3 text-gray-700 sm:h-3.5 sm:w-3.5" />
										</button>
										<span class="w-6 text-center text-sm font-medium text-gray-900 sm:w-8">
											{item.quantity}
										</span>
										<button
											onclick={() => cartStore.updateQuantity(item.cartItemId, item.quantity + 1)}
											class="rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 sm:p-1.5"
											aria-label="Increase quantity"
										>
											<Icon icon="lucide:plus" class="h-3 w-3 text-gray-700 sm:h-3.5 sm:w-3.5" />
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
			<div class="flex-shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4">
				<!-- Success Badge -->
				{#if isDelivery && qualifiesForFreeDelivery}
					<div class="mb-3 rounded-lg border border-green-200 bg-green-50 p-2.5">
						<p class="flex items-center gap-1.5 text-xs font-semibold text-green-800">
							<span class="text-base">🎉</span>
							You've unlocked free delivery!
						</p>
					</div>
				{/if}

				<!-- Totals -->
				<div class="mb-3 space-y-2 rounded-lg bg-gray-50 p-2.5 sm:p-3">
					<div class="flex justify-between text-xs sm:text-sm">
						<span class="text-gray-600">Subtotal</span>
						<span class="font-medium text-gray-900">{formatPrice(subtotal)}</span>
					</div>
					<div class="flex justify-between text-xs sm:text-sm">
						<span class="text-gray-600">Delivery</span>
						<span class="font-medium {deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}">
							{deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
						</span>
					</div>
					<div class="flex justify-between border-t border-gray-200 pt-2">
						<span class="text-sm font-semibold text-gray-900 sm:text-base">Total</span>
						<span class="text-lg font-bold text-green-600 sm:text-xl">
							{formatPrice(totalPrice)}
						</span>
					</div>
				</div>

				<!-- Actions -->
				<button
					onclick={handleCheckout}
					class="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 sm:py-3 sm:text-base"
				>
					Checkout
					<Icon icon="lucide:arrow-right" class="h-4 w-4" />
				</button>
				<button
					onclick={handleClearCart}
					class="w-full text-xs text-red-600 transition hover:text-red-700 sm:text-sm"
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
