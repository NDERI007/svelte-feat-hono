<script lang="ts">
	import { formatDate } from '$lib/utils/formatters';
	import Icon from '@iconify/svelte';

	let { orderId, createdAt } = $props();
</script>

<div class="mb-6 rounded-2xl bg-white p-8 text-center shadow-lg">
	<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
		<Icon icon="lucide:check" class="h-8 w-8 text-green-900" />
	</div>
	<h1 class="mb-2 text-3xl font-bold text-green-900">Order Confirmed</h1>
	<p class="mb-4 text-gray-700">Thank you for your purchase!</p>
	<p class="text-sm text-gray-600">
		Order{' '}
		<span class="font-mono font-semibold text-green-900">
			#{orderId.slice(0, 8).toUpperCase()}
		</span>
	</p>
	<p class="mt-2 text-xs text-gray-500">{formatDate(createdAt)}</p>
</div>
