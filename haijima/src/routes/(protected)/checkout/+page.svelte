<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { toast } from 'svelte-sonner';

	// --- Logic Imports ---
	import { cartStore } from '$lib/stores/cart.svelte';
	import { deliveryStore, FREE_DELIVERY_THRESHOLD } from '$lib/stores/delivery.svelte';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { getImageUrl } from '$lib/utils/getImage';

	// --- Components ---
	import AddressModal from '$lib/components/AddressModal.svelte';

	// --- Types ---
	import type { SavedAddress } from '$lib/schemas/address';
	import type { DeliveryLocation } from '$lib/schemas/address';
	import { PUBLIC_API_URL } from '$env/static/public';

	let mpesaPhone = $state('');
	let isEditing = $state(false);
	let showModal = $state(false);
	let savedAddresses = $state<SavedAddress[]>([]);
	let isLoadingAddresses = $state(false);
	let orderNotes = $state('');
	let isProcessing = $state(false);

	// --- Derived State ---
	let isDelivery = $derived(deliveryStore.deliveryOption === 'delivery');

	let subtotal = $derived(
		cartStore.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
	);

	let deliveryFee = $derived(deliveryStore.getDeliveryFee(subtotal));
	let total = $derived(subtotal + deliveryFee);

	let amountUntilFreeDelivery = $derived(Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal));
	let qualifiesForFreeDelivery = $derived(subtotal >= FREE_DELIVERY_THRESHOLD);

	const restaurantInfo = {
		name: "Weddy's Kitchen",
		address: 'Moringa Centre, Near playstation',
		phone: '0745340424',
		hours: '9:00 AM - 9:30 PM',
		mapUrl: 'https://maps.google.com/?q=Moringa+Centre'
	};

	const API_BASE = PUBLIC_API_URL;
	// --- Effects ---

	// 1. Fetch Saved Addresses when modal opens
	$effect(() => {
		if (!showModal) return;
		let cancelled = false;

		const fetchSavedAddresses = async () => {
			isLoadingAddresses = true;
			try {
				const res = await fetch(`${API_BASE}/api/addr/look-up`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },

					credentials: 'include'
				});

				if (!res.ok) throw new Error('Failed to fetch addresses');
				const data = await res.json();
				if (!cancelled) savedAddresses = data;
			} catch (err) {
				console.error(err);
				toast.error('Could not load saved addresses');
			} finally {
				if (!cancelled) isLoadingAddresses = false;
			}
		};

		fetchSavedAddresses();
		return () => {
			cancelled = true;
		};
	});

	// --- Handlers ---

	function handleChangeAddress() {
		showModal = true;
	}

	// The modal now handles Search AND Manual Entry internally.
	// It returns a formatted DeliveryLocation.
	function handleAddressSelect(location: DeliveryLocation) {
		deliveryStore.setDeliveryAddress(location);
		showModal = false;
	}

	async function handlePlaceOrder() {
		if (isDelivery && !deliveryStore.place) {
			toast.error('Please select a delivery address');
			return;
		}

		if (!mpesaPhone) {
			toast.error('Please enter your M-PESA phone number');
			return;
		}

		const phoneRegex = /^(?:254|\+254|0)?(7\d{8}|1\d{8})$/;
		if (!phoneRegex.test(mpesaPhone)) {
			toast.error('Please enter a valid M-PESA phone number');
			return;
		}

		let normalizedPhone = mpesaPhone.replace(/\s+/g, '');
		if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.substring(1);
		else if (normalizedPhone.startsWith('+')) normalizedPhone = normalizedPhone.substring(1);
		else if (!normalizedPhone.startsWith('254')) normalizedPhone = '254' + normalizedPhone;

		isProcessing = true;

		const orderData = {
			delivery_type: isDelivery ? 'delivery' : 'pickup',

			...(isDelivery && {
				delivery_address_main_text: deliveryStore.place?.address,
				delivery_address_secondary_text: '',
				delivery_place_id: deliveryStore.place?.place_id,
				delivery_lat: deliveryStore.place?.lat,
				delivery_lng: deliveryStore.place?.lng
			}),

			payment_method: 'mpesa',
			mpesa_phone: normalizedPhone,
			subtotal: Number(subtotal.toFixed(2)),
			delivery_fee: Number(deliveryFee.toFixed(2)),
			total_amount: Number(total.toFixed(2)),
			order_notes: orderNotes || null,

			items: cartStore.items.map((item) => ({
				product_id: item.productId,
				variant_id: item.variantId || null,
				quantity: item.quantity
			}))
		};

		try {
			const response = await fetch(`${API_BASE}/api/orders/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(orderData),
				credentials: 'include'
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || 'Failed to create order');
			}

			const orderID = result.order;
			if (!orderID) throw new Error('Failed to get order ID');

			toast.success('Order created successfully!');
			cartStore.clearCart();
			deliveryStore.clearDelivery();
			goto(`/confirmation?orderID=${orderID}`);
		} catch (err: unknown) {
			console.error('Order creation failed:', err);
			if (err instanceof Error) toast.error(err.message);
			else toast.error('Unexpected error occurred');
		} finally {
			isProcessing = false;
		}
	}
</script>

{#if cartStore.items.length === 0}
	<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
		<div class="mb-4 flex items-center justify-center text-gray-300">
			<Icon icon="lucide:shopping-bag" width="64" height="64" />
		</div>
		<h2 class="text-xl font-semibold text-gray-900">Your cart is empty</h2>
		<p class="mt-2 text-gray-500">Add some items to get started!</p>
		<button
			onclick={() => goto('/dashboard')}
			class="mt-4 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 font-medium"
		>
			Browse Menu
		</button>
	</div>
{:else}
	<div class="min-h-screen py-6">
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid gap-6 lg:grid-cols-3">
				<div class="space-y-6 lg:col-span-2">
					<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
						<h2 class="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
							How would you like to receive your order?
						</h2>

						<div class="grid gap-3 sm:grid-cols-2">
							<button
								onclick={() => deliveryStore.setDeliveryOption('delivery')}
								disabled={isProcessing}
								class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition sm:p-5 disabled:opacity-50 {deliveryStore.deliveryOption ===
								'delivery'
									? 'border-green-600 bg-green-50'
									: 'border-gray-200 bg-white hover:border-gray-300'}"
							>
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900">Delivery</h3>
									<p class="mt-0.5 text-sm text-gray-600">
										Get your order delivered to your doorstep
									</p>
									{#if deliveryStore.deliveryOption === 'delivery'}
										<div class="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
											<Icon icon="lucide:check" width="14" />
											Selected
										</div>
									{/if}
								</div>
							</button>

							<button
								onclick={() => deliveryStore.setDeliveryOption('pickup')}
								disabled={isProcessing}
								class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition sm:p-5 disabled:opacity-50 {deliveryStore.deliveryOption ===
								'pickup'
									? 'border-green-600 bg-green-50'
									: 'border-gray-200 bg-white hover:border-gray-300'}"
							>
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900">Pickup</h3>
									<p class="mt-0.5 text-sm text-gray-600">Collect your order from our location</p>
									{#if deliveryStore.deliveryOption === 'pickup'}
										<div class="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
											<Icon icon="lucide:check" width="14" />
											Selected
										</div>
									{/if}
								</div>
							</button>
						</div>
					</div>

					<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
						<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
							<h2 class="text-lg font-bold text-gray-900 sm:text-xl">
								{isDelivery ? 'Delivery Address' : 'Pickup Location'}
							</h2>
						</div>

						{#if isDelivery}
							<div class="flex items-start gap-3">
								<Icon icon="lucide:map-pin" class="mt-1 flex-shrink-0 text-gray-500" width="20" />
								<div class="flex-1">
									{#if deliveryStore.place}
										<div>
											<p class="font-medium text-gray-900">{deliveryStore.place.address}</p>
										</div>
									{:else}
										<p class="text-sm text-gray-500">No address selected yet</p>
									{/if}
								</div>
								<button
									onclick={handleChangeAddress}
									disabled={isProcessing}
									class="flex-shrink-0 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
								>
									{deliveryStore.place ? 'Change' : 'Select'}
								</button>
							</div>
						{:else}
							<div class="flex items-start gap-3">
								<div>
									<p class="font-medium text-gray-900">{restaurantInfo.name}</p>
									<p class="text-sm text-gray-600">{restaurantInfo.address}</p>
									<p class="mt-1 flex items-center gap-1 text-xs text-gray-500">
										<Icon icon="lucide:clock" width="12" />
										{restaurantInfo.hours}
									</p>
									<p class="flex items-center gap-1 text-xs text-gray-500">
										<Icon icon="lucide:phone" width="12" />
										{restaurantInfo.phone}
									</p>
									<button
										onclick={() => window.open(restaurantInfo.mapUrl, '_blank')}
										class="mt-2 text-sm font-medium text-green-600 hover:text-green-700"
									>
										Get Directions →
									</button>
								</div>
							</div>
						{/if}
					</div>

					<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-xl font-bold text-gray-900">
								Order Items ({cartStore.items.length})
							</h2>
							<button
								onclick={() => (isEditing = !isEditing)}
								disabled={isProcessing}
								class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
							>
								{isEditing ? 'Done' : 'Edit'}
							</button>
						</div>

						<div class="space-y-3">
							{#each cartStore.items as item (item.cartItemId)}
								{@const imageUrl = getImageUrl(item.image)}
								<div
									class="flex gap-4 rounded-lg border border-gray-200 p-3 transition hover:shadow-sm"
								>
									{#if imageUrl}
										<img
											src={imageUrl}
											alt={item.name}
											class="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
										/>
									{/if}
									<div class="flex min-w-0 flex-1 flex-col">
										<h4 class="font-semibold text-gray-900">{item.name}</h4>
										<div class="mt-1 flex items-center justify-between">
											<span class="font-bold text-green-600">
												KES {(item.price * item.quantity).toFixed(2)}
											</span>
											<span class="text-xs text-gray-500">
												KES {item.price.toFixed(2)} each
											</span>
										</div>
									</div>

									{#if isEditing}
										<div class="flex flex-col items-end justify-between">
											<button
												onclick={() => cartStore.removeItem(item.cartItemId)}
												disabled={isProcessing}
												class="rounded-full p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
											>
												<Icon icon="lucide:trash-2" width="16" />
											</button>
											<div class="flex items-center gap-2 rounded-lg bg-gray-50 p-1">
												<button
													onclick={() =>
														cartStore.updateQuantity(item.cartItemId, item.quantity - 1)}
													disabled={isProcessing}
													class="rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
												>
													<Icon icon="lucide:minus" width="12" class="text-gray-700" />
												</button>
												<span class="w-6 text-center text-sm font-medium">
													{item.quantity}
												</span>
												<button
													onclick={() =>
														cartStore.updateQuantity(item.cartItemId, item.quantity + 1)}
													disabled={isProcessing}
													class="rounded-md bg-white p-1 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
												>
													<Icon icon="lucide:plus" width="12" class="text-gray-700" />
												</button>
											</div>
										</div>
									{:else}
										<div class="flex items-center">
											<span class="text-sm font-medium text-gray-600">
												Qty: {item.quantity}
											</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
						<h2 class="mb-3 text-xl font-bold text-gray-900">Order Notes (Optional)</h2>
						<div class="relative">
							<textarea
								bind:value={orderNotes}
								disabled={isProcessing}
								placeholder="Any special instructions for your order..."
								rows="3"
								class="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-5 focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
							></textarea>
						</div>
					</div>
				</div>

				<div class="lg:col-span-1">
					<div class="sticky top-6 space-y-4">
						<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
							<h3 class="mb-4 text-lg font-bold text-gray-900">M-PESA Payment</h3>

							<div
								class="mb-4 flex items-center gap-3 rounded-lg border-2 border-green-600 bg-green-50 p-3"
							>
								<div class="flex-1 text-left">
									<div class="text-sm font-semibold text-gray-900">M-PESA</div>
									<div class="text-xs text-gray-500">Mobile money payment</div>
								</div>
							</div>

							<div class="space-y-3">
								<div>
									<label for="mpesa-phone" class="mb-1 block text-sm font-medium text-gray-700">
										Phone Number
									</label>
									<input
										id="mpesa-phone"
										type="tel"
										bind:value={mpesaPhone}
										disabled={isProcessing}
										placeholder="0712345678"
										class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
									/>
								</div>
								<div class="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
									<Icon
										icon="lucide:alert-circle"
										class="mt-0.5 flex-shrink-0 text-blue-600"
										width="16"
									/>
									<p class="text-xs text-blue-900">
										You'll receive an M-PESA prompt on your phone to complete payment.
									</p>
								</div>
							</div>
						</div>

						<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
							<h3 class="mb-4 text-lg font-bold text-gray-900">Order Summary</h3>
							<div class="space-y-3">
								<div class="flex justify-between text-sm text-gray-600">
									<span>Subtotal</span>
									<span class="font-medium">KES {subtotal.toFixed(2)}</span>
								</div>
								<div class="flex justify-between text-sm text-gray-600">
									<span>Delivery Fee</span>
									<span
										class="font-medium {deliveryFee === 0 ? 'text-green-600' : 'text-gray-900'}"
									>
										{deliveryFee === 0 ? 'Free' : `KES ${deliveryFee.toFixed(2)}`}
									</span>
								</div>

								{#if isDelivery && !qualifiesForFreeDelivery && amountUntilFreeDelivery > 0 && amountUntilFreeDelivery <= 50}
									<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
										<p class="text-xs text-amber-800">
											Add <span class="font-bold">KES {amountUntilFreeDelivery.toFixed(2)}</span> more
											for free delivery!
										</p>
										<div class="mt-2 h-2 w-full rounded-full bg-amber-200">
											<div
												class="h-full rounded-full bg-amber-500 transition-all"
												style="width: {Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%"
											></div>
										</div>
									</div>
								{/if}

								{#if isDelivery && qualifiesForFreeDelivery}
									<div class="rounded-lg border border-green-200 bg-green-50 p-3">
										<p class="flex items-center gap-1 text-xs font-semibold text-green-800">
											<span class="text-base">🎉</span> You've unlocked free delivery!
										</p>
									</div>
								{/if}

								<div class="border-t border-gray-200 pt-3">
									<div class="flex justify-between">
										<span class="font-semibold text-gray-900">Total</span>
										<span class="text-xl font-bold text-green-600">KES {total.toFixed(2)}</span>
									</div>
								</div>
							</div>

							<button
								onclick={handlePlaceOrder}
								disabled={!mpesaPhone || (isDelivery && !deliveryStore.place) || isProcessing}
								class="mt-4 w-full rounded-lg py-3 font-semibold text-white transition {mpesaPhone &&
								(!isDelivery || deliveryStore.place) &&
								!isProcessing
									? 'bg-green-600 hover:bg-green-700'
									: 'cursor-not-allowed bg-gray-300'}"
							>
								{#if isProcessing}
									<span class="flex items-center justify-center gap-2">
										<Icon icon="lucide:loader-2" class="animate-spin" width="20" />
										Processing...
									</span>
								{:else}
									Pay with M-PESA
								{/if}
							</button>

							{#if (!mpesaPhone || (isDelivery && !deliveryStore.place)) && !isProcessing}
								<p class="mt-2 text-center text-xs text-gray-500">
									{!mpesaPhone ? 'Enter M-PESA phone number' : ''}
									{mpesaPhone && isDelivery && !deliveryStore.place
										? 'Select delivery address'
										: ''}
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<AddressModal
		bind:open={showModal}
		onSelect={handleAddressSelect}
		{savedAddresses}
		isLoading={isLoadingAddresses}
	/>
{/if}
