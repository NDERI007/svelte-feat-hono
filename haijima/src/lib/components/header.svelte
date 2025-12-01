<script lang="ts">
	import Icon from '@iconify/svelte';

	// Props
	let {
		onToggleMenu // Optional: If you want a mobile sidebar trigger
	} = $props<{
		onToggleMenu?: () => void;
	}>();
</script>

<header class="sticky top-0 z-50 border-b border-gray-100 bg-white/80 shadow-sm backdrop-blur-md">
	<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
		<div class="flex items-center gap-3">
			{#if onToggleMenu}
				<button
					onclick={onToggleMenu}
					class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
					aria-label="Toggle menu"
				>
					<Icon icon="lucide:menu" class="h-6 w-6" />
				</button>
			{/if}

			<a
				href="/dashboard"
				class="flex items-center gap-2 text-xl font-bold tracking-tight text-green-900 transition-opacity hover:opacity-80"
				style="text-decoration: none;"
			>
				<span class="inline sm:hidden">WK</span>
				<span class="hidden sm:inline">Weddyskitchen</span>
			</a>
		</div>
	</div>
</header>
