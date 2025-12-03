<script lang="ts">
	import type { Category } from '$lib/schemas/menu';
	import Icon from '@iconify/svelte';

	let { categories, activeCategory, onSelect } = $props<{
		categories: Category[];
		activeCategory: string;
		onSelect: (id: string) => void;
	}>();

	let scrollContainer = $state<HTMLDivElement>();
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function checkScroll() {
		if (!scrollContainer) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

		// Allow a 1px buffer for calculation errors on some screens
		canScrollLeft = scrollLeft > 0;
		canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;
	}

	function scroll(dir: 'left' | 'right') {
		if (!scrollContainer) return;
		const scrollAmount = 200;

		scrollContainer.scrollBy({
			left: dir === 'left' ? -scrollAmount : scrollAmount,
			behavior: 'smooth'
		});
	}

	// 4. Reactive Effects
	// Re-check scroll whenever categories change (in case width changes)
	$effect(() => {
		// We reference 'categories' so this runs when they update
		if (categories) {
			// Tiny timeout allows DOM to update width before checking
			setTimeout(checkScroll, 50);
		}
	});
</script>

<!-- Window listener for resize -->
<svelte:window onresize={checkScroll} />

<div class="relative max-w-full overflow-hidden group">
	<!-- Left Arrow -->
	{#if canScrollLeft}
		<button
			onclick={() => scroll('left')}
			class="absolute top-1/2 left-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition md:flex filter-arrow"
			aria-label="Scroll left"
		>
			<Icon icon="lucide:chevron-left" class="h-5 w-5" />
		</button>
	{/if}

	<!-- 
        Scrollable Container 
        - bind:this={scrollContainer}: Connects the DOM element to our state
        - onscroll={checkScroll}: Native Svelte event listener
    -->
	<div
		bind:this={scrollContainer}
		onscroll={checkScroll}
		class="scrollbar-hide flex max-w-full gap-2 overflow-x-auto scroll-smooth py-4 sm:gap-3 md:px-12"
	>
		{#each categories as cat (cat.id)}
			{@const isActive = activeCategory === cat.id}

			<button
				onclick={() => onSelect(cat.id)}
				class="flex shrink-0 flex-col items-center gap-2 rounded-xl px-3 py-3 transition sm:min-w-[90px] sm:px-4 sm:py-3 filter-category-btn
                {isActive ? 'filter-category-active' : 'filter-category-inactive'}"
			>
				<!-- Icon -->
				{#if cat.icon_url}
					<div class="flex items-center justify-center p-2">
						<img
							src={cat.icon_url}
							alt={cat.name}
							class="h-8 w-8 object-contain md:h-12 md:w-12 filter-category-icon"
							loading="lazy"
						/>
					</div>
				{/if}

				<!-- Name -->
				<span class="text-sm font-normal sm:text-sm md:text-sm filter-category-name">
					{cat.name}
				</span>
			</button>
		{/each}
	</div>

	<!-- Right Arrow -->
	{#if canScrollRight}
		<button
			onclick={() => scroll('right')}
			class="absolute top-1/2 right-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition md:flex filter-arrow"
			aria-label="Scroll right"
		>
			<Icon icon="lucide:chevron-right" class="h-5 w-5" />
		</button>
	{/if}
</div>

<style>
	/* Scoped styles automatically handle the scrollbar hiding */
	.scrollbar-hide {
		scrollbar-width: none; /* Firefox */
		-ms-overflow-style: none; /* IE/Edge */
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none; /* Chrome/Safari */
	}
</style>
