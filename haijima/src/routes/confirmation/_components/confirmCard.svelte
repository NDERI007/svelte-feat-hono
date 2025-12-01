<script lang="ts">
	import Icon from '@iconify/svelte';

	let { deliveryType, confirmingDelivery, onConfirm } = $props();
</script>

<div
	class="mb-6 rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-8 text-white shadow-lg"
>
	<div class="mb-4 flex items-center gap-3">
		<div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
			<Icon icon="lucide:package" class="h-6 w-6 text-white" />
		</div>
		<div>
			<h2 class="text-xl font-bold">
				{#if deliveryType === 'pickup'}
					Ready for Pickup!
				{:else}
					Delivery in Progress
				{/if}
			</h2>
			<p class="text-sm text-green-100">
				{#if deliveryType === 'pickup'}
					Your order is ready. Come pick it up and confirm receipt.
				{:else}
					Your order is on the way. Confirm when you receive it.
				{/if}
			</p>
		</div>
	</div>

	<button
		onclick={onConfirm}
		disabled={confirmingDelivery}
		class="w-full rounded-xl bg-white py-4 font-semibold text-green-900 transition-all hover:bg-green-50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
	>
		<div class="flex items-center justify-center gap-2">
			{#if confirmingDelivery}
				<Icon icon="lucide:loader-2" class="h-5 w-5 animate-spin" />
				Confirming...
			{:else}
				<Icon icon="lucide:check-circle" class="h-5 w-5" />
				Confirm {deliveryType === 'pickup' ? 'Pickup' : 'Delivery'} Received
			{/if}
		</div>
	</button>

	<div class="mt-4 rounded-lg bg-white/10 p-4">
		<p class="text-sm text-green-100">
			<strong class="text-white">Note:</strong> Our delivery person will take a photo as proof of delivery.
			Please confirm once you've received your order.
		</p>
	</div>
</div>
