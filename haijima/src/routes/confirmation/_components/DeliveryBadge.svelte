<script lang="ts">
	import Icon from '@iconify/svelte';

	let { deliveryType } = $props();
</script>

<div class="mb-6 rounded-2xl border-2 border-green-200 bg-green-50 p-6 shadow-lg">
	<div class="flex items-center gap-3">
		<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
			<Icon icon="lucide:check-circle" class="h-6 w-6 text-white" />
		</div>
		<div>
			<h3 class="text-lg font-bold text-green-900">
				{deliveryType === 'pickup' ? 'Order Picked Up' : 'Delivery Confirmed'}
			</h3>
		</div>
	</div>
</div>
