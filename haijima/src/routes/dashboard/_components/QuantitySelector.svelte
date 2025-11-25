<script lang="ts">
	import Icon from '@iconify/svelte';

	// $bindable allows two-way binding
	let { quantity = $bindable(1) } = $props<{ quantity: number }>();

	function handleDecrement() {
		quantity = Math.max(1, quantity - 1);
	}

	function handleIncrement() {
		quantity += 1;
	}
</script>

<div class="flex items-center gap-2">
	<span class="text-sm font-medium">Quantity</span>

	<div class="flex items-center rounded-lg border border-gray-300 bg-white">
		<button
			onclick={handleDecrement}
			class="p-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
			aria-label="Decrease quantity"
			disabled={quantity <= 1}
		>
			<Icon icon="lucide:minus" width="16" height="16" />
		</button>

		<div class="w-10 text-center font-medium select-none">
			{quantity}
		</div>

		<button
			onclick={handleIncrement}
			class="p-2 text-gray-600 transition hover:bg-gray-100"
			aria-label="Increase quantity"
		>
			<Icon icon="lucide:plus" width="16" height="16" />
		</button>
	</div>
</div>
