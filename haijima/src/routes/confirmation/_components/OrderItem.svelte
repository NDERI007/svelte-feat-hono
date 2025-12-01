<script lang="ts">
	import Icon from '@iconify/svelte';
	import { formatCurrency } from '$lib/utils/formatters'; // Adjust import path

	let { items, subtotal, deliveryFee, totalAmount, deliveryType } = $props();
</script>

<div class="mb-6 rounded-2xl bg-white p-8 shadow-lg">
	<h2 class="mb-6 text-xl font-bold text-green-900">Order Items</h2>

	<div class="space-y-4">
		{#each items as item (item.id)}
			<div class="flex items-center justify-between border-b border-gray-200 py-4 last:border-b-0">
				<div class="flex items-center">
					<div
						class="mr-4 flex h-16 w-16 items-center justify-center rounded-lg bg-green-50 text-green-900"
						aria-hidden="true"
					>
						<Icon icon="lucide:package" class="h-8 w-8" />
					</div>

					<div>
						<p class="font-semibold text-green-900">
							{item.product_name}
						</p>
						<p class="text-sm text-gray-600">
							Quantity: {item.quantity}
							{#if item.variant_size}
								<span class="ml-2 text-gray-500">
									• Size: {item.variant_size}
								</span>
							{/if}
						</p>
					</div>
				</div>

				<p class="font-semibold text-green-900">
					{formatCurrency(item.price)}
				</p>
			</div>
		{/each}
	</div>

	<div class="mt-6 space-y-2 border-t border-gray-200 pt-6">
		<div class="flex justify-between text-gray-700">
			<p>Subtotal</p>
			<p>{formatCurrency(subtotal)}</p>
		</div>

		<div class="flex justify-between text-gray-700">
			<p>{deliveryType === 'delivery' ? 'Delivery Fee' : 'Pickup'}</p>
			<p>{formatCurrency(deliveryFee)}</p>
		</div>

		<div class="flex items-center justify-between border-t border-green-900 pt-2">
			<p class="text-lg font-bold text-green-900">Total</p>
			<p class="text-2xl font-bold text-green-900">
				{formatCurrency(totalAmount)}
			</p>
		</div>
	</div>
</div>
