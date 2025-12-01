<script lang="ts">
	import Icon from '@iconify/svelte';

	let { email, mpesaPhone, paymentReference } = $props();
</script>

<div class="mb-6 rounded-2xl bg-white p-8 shadow-lg">
	<h2 class="mb-4 text-xl font-bold text-green-900">Order Details</h2>

	{#if email}
		<div class="mb-4 flex items-center text-gray-700">
			<Icon icon="lucide:mail" class="mr-3 h-5 w-5 text-green-900" />
			<div>
				<p class="text-sm font-semibold text-green-900">Confirmation sent to</p>
				<p class="text-sm text-gray-600">{email}</p>
			</div>
		</div>
	{/if}

	{#if mpesaPhone}
		<div class="flex items-center text-gray-700">
			<Icon icon="lucide:phone" class="mr-3 h-5 w-5 text-green-900" />
			<div>
				<p class="text-sm font-semibold text-green-900">Payment from</p>
				<p class="text-sm text-gray-600">{mpesaPhone}</p>
				{#if paymentReference}
					<p class="mt-1 text-xs text-gray-500">
						Ref: {paymentReference}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
