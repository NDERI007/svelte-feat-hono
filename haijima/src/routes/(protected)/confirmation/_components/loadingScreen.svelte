<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onDestroy } from 'svelte';

	let {
		message,

		connectionStatus = 'connecting', // 'connecting' | 'connected' | 'error'
		showTimer = true
	} = $props();

	// Internal timer state (so parent doesn't have to manage it)
	let seconds = $state(0);

	// Auto-increment timer
	const timer = setInterval(() => {
		seconds += 1;
	}, 1000);

	onDestroy(() => {
		clearInterval(timer);
	});

	// Derived status text
	let statusText = $derived.by(() => {
		if (connectionStatus === 'connected') return 'Connection Established';
		if (connectionStatus === 'error') return 'Connection Lost';
		return 'Listening for payment...';
	});

	// Derived status color
	let statusColor = $derived.by(() => {
		if (connectionStatus === 'connected') return 'bg-green-500';
		if (connectionStatus === 'error') return 'bg-red-500';
		return 'bg-yellow-500 animate-pulse';
	});
</script>

<div class="flex min-h-screen items-center justify-center px-4" style="background-color: #fefaef">
	<div class="w-full max-w-md rounded-2xl bg-white p-12 text-center shadow-lg">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
			<Icon icon="lucide:loader-2" class="h-8 w-8 animate-spin text-green-900" />
		</div>

		<h2 class="mb-2 text-2xl font-bold text-green-900">{message}</h2>

		<div class="rounded-lg p-4 mt-6" style="background-color: #fefaef">
			<div class="mb-2 flex items-center justify-center gap-2">
				<div class={`h-2 w-2 rounded-full ${statusColor}`}></div>

				<p class="text-xs text-gray-600 font-medium">
					{statusText}
				</p>
			</div>

			<p class="text-sm text-gray-700">Please check your phone</p>

			{#if showTimer}
				<p class="mt-2 text-xs text-gray-500 font-mono">
					Time elapsed: {seconds}s
				</p>
			{/if}
		</div>
	</div>
</div>
