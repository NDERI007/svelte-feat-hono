<script lang="ts">
	let { deliveryType, mainText, secondaryText, instructions } = $props();
</script>

<div class="mb-6 rounded-2xl bg-white p-8 shadow-lg">
	<h2 class="mb-4 text-xl font-bold text-green-900">
		{deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
	</h2>

	{#if deliveryType === 'delivery'}
		<div class="text-gray-700">
			{#if mainText}
				<p class="mb-1 font-semibold text-green-900">{mainText}</p>
			{/if}
			{#if secondaryText}
				<p class="mb-3 text-sm text-gray-600">{secondaryText}</p>
			{/if}
			{#if instructions}
				<div class="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
					<p class="mb-1 text-sm font-semibold text-green-900">Delivery Instructions</p>
					<p class="text-sm text-green-800">{instructions}</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-gray-700">
			<p class="mb-2 font-semibold text-green-900">Store Pickup</p>
			<p class="text-sm text-gray-600">
				Your order will be ready for pickup within 24-48 hours. We'll notify you when it's ready.
			</p>
		</div>
	{/if}
</div>
