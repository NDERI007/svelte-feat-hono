<script lang="ts">
	import Icon from '@iconify/svelte';
	let { error, onRetry, onViewOrders } = $props();
</script>

<div class="flex min-h-screen items-center justify-center px-4" style="background-color: #fefaef">
	<div class="w-full max-w-md rounded-2xl bg-white p-12 text-center shadow-lg">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
			<Icon icon="lucide:alert-circle" class="h-8 w-8 text-red-600" />
		</div>
		<h2 class="mb-2 text-2xl font-bold text-green-900">Payment Verification Delayed</h2>
		<p class="mb-6 text-gray-700">{error}</p>
		<div class="space-y-3">
			<button
				onclick={onRetry}
				class="w-full rounded-xl bg-green-900 py-3 font-semibold text-white transition-colors hover:bg-green-800"
			>
				Try Again
			</button>
			<button
				onclick={onViewOrders}
				class="w-full rounded-xl border-2 border-green-900 bg-white py-3 font-semibold text-green-900 transition-colors hover:bg-green-50"
			>
				View My Orders
			</button>
		</div>
	</div>
</div>
