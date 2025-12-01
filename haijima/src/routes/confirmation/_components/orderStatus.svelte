<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getEstimatedDelivery } from '$lib/utils/formatters'; // Adjust import path

	let { status, deliveryType, createdAt } = $props();
</script>

<div class="mb-6 rounded-2xl bg-white p-8 shadow-lg">
	<h2 class="mb-4 text-xl font-bold text-green-900">Order Status</h2>

	<div class="space-y-4">
		<div class="flex items-start gap-4">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-900 text-white">
				<Icon icon="lucide:check" class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<p class="font-semibold text-green-900">Order Confirmed</p>
				<p class="text-sm text-gray-600">Payment received and order is being prepared</p>
			</div>
		</div>

		{#if status === 'out_for_delivery'}
			<div class="flex items-start gap-4">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
					<Icon icon="lucide:clock" class="h-5 w-5" />
				</div>
				<div class="flex-1">
					<p class="font-semibold text-blue-900">
						{deliveryType === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery'}
					</p>
					<p class="text-sm text-gray-600">
						{deliveryType === 'pickup'
							? 'Your order is ready! Come pick it up anytime.'
							: 'Your order is on its way to you'}
					</p>
				</div>
			</div>
		{:else}
			<div class="flex items-start gap-4">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-400"
				>
					<Icon icon="lucide:package" class="h-5 w-5" />
				</div>
				<div class="flex-1">
					<p class="font-semibold text-gray-500">Preparing Order</p>
					<p class="text-sm text-gray-600">
						{deliveryType === 'pickup'
							? "We'll notify you when your order is ready for pickup"
							: `Estimated delivery: ${getEstimatedDelivery(createdAt)}`}
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
