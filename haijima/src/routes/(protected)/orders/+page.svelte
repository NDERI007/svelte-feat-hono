<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';

	// Stores & Utils
	import { cartStore } from '$lib/stores/cart.svelte';
	import { deliveryStore } from '$lib/stores/delivery.svelte';
	import { formatCurrency } from '$lib/utils/formatters';

	// Types
	import type { OrderHistoryItem } from '$lib/schemas/menu'; // Ensure this matches your path

	// Props
	let { data } = $props();
	let orders = $derived(data.orders as OrderHistoryItem[]);

	// Local State
	let expanded = $state<string | null>(null);

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
	}

	function firstItemTitle(order: OrderHistoryItem) {
		const first = order.items?.[0];
		if (!first) return `Order #${order.id.slice(0, 6)}`;
		const size = first.variant_size ? ` (${first.variant_size})` : '';
		return `${first.product_name}${size}`.toUpperCase();
	}

	function handleReorder(order: OrderHistoryItem) {
		try {
			// 1. Snapshot previous state for undo
			const previousItems = [...cartStore.items];

			cartStore.reorderItems(order.items); // ✅ Type-safe now

			// 3. Set Delivery Type
			deliveryStore.setDeliveryOption(order.delivery_type as 'delivery' | 'pickup');

			// 4. Toast with Undo
			toast.success('Items added to cart', {
				description: 'Proceed to checkout to complete order',
				action: {
					label: 'Undo',
					onClick: () => {
						cartStore.items = previousItems; // Restore
						toast.info('Cart restored');
					}
				}
			});

			// 5. Navigate
			goto('/checkout');
		} catch (error) {
			console.error(error);
			toast.error('Failed to reorder');
		}
	}
</script>

<div class="min-h-screen bg-[#FEFAEF] p-4 md:p-8">
	<h1 class="mb-6 text-center text-2xl font-bold text-green-900">Order History</h1>

	{#if orders.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center text-green-900/70">
			<Icon icon="lucide:package-open" width="48" class="mb-4 opacity-50" />
			<p>You have no past orders yet.</p>
			<button
				onclick={() => goto('/dashboard')}
				class="mt-4 text-green-600 underline hover:text-green-800"
			>
				Browse Menu
			</button>
		</div>
	{/if}

	<div class="mx-auto max-w-xl space-y-4">
		{#each orders as order (order.id)}
			{@const isOpen = expanded === order.id}

			<article
				class="overflow-hidden rounded-lg border bg-white shadow-sm transition-all {isOpen
					? 'ring-1 ring-green-900/10'
					: 'border-green-900/10'}"
			>
				<button
					onclick={() => toggle(order.id)}
					class="flex w-full items-center justify-between p-4 text-left hover:bg-green-50/50 transition-colors"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-green-900/5 font-semibold text-green-900"
						>
							{order.items?.[0]?.product_name?.charAt(0).toUpperCase() || '#'}
						</div>

						<div>
							<p class="text-sm font-semibold text-green-900">
								{firstItemTitle(order)}
							</p>
							<p class="text-xs text-green-900/60">
								{new Date(order.created_at).toLocaleDateString()} at {new Date(
									order.created_at
								).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</p>
						</div>
					</div>

					<div class="flex items-center gap-1 text-xs text-green-900/80">
						{isOpen ? 'Hide' : 'Details'}
						<Icon icon={isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'} />
					</div>
				</button>

				{#if isOpen}
					<div
						transition:slide={{ duration: 200 }}
						class="border-t border-green-100 bg-green-50/10 p-4"
					>
						<div class="space-y-2 font-mono text-[14px] text-green-900">
							{#each order.items as item}
								<div class="flex justify-between">
									<span>
										{item.product_name.toUpperCase()}
										{item.variant_size ? ` (${item.variant_size})` : ''}
									</span>
									<span>
										{item.quantity} × {formatCurrency(item.price)}
									</span>
								</div>
							{/each}
						</div>

						<div class="my-3 border-t border-green-900/10"></div>

						<div class="space-y-1 font-mono text-[15px] text-green-900">
							<div class="flex justify-between text-xs text-green-900/70">
								<span>Subtotal</span>
								<span>{formatCurrency(order.subtotal)}</span>
							</div>
							<div class="flex justify-between text-xs text-green-900/70">
								<span>Delivery</span>
								<span>{formatCurrency(order.delivery_fee)}</span>
							</div>
							<div class="flex justify-between font-bold mt-2">
								<span>Total</span>
								<span>{formatCurrency(order.total_amount)}</span>
							</div>
						</div>

						<div class="mt-4 flex justify-end">
							<button
								onclick={() => handleReorder(order)}
								class="flex items-center gap-2 rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-[#FEFAEF] transition hover:bg-green-800 active:scale-95"
							>
								<Icon icon="lucide:rotate-cw" width="16" />
								Reorder
							</button>
						</div>
					</div>
				{/if}
			</article>
		{/each}
	</div>
</div>
