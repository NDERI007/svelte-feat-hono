<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Icon from '@iconify/svelte';

	import Navbar from './_components/Navbar.svelte';
	import Sidebar from './_components/Sidebar.svelte';
	import CartDrawer from './_components/CartDrawer.svelte';
	import CategoryFilter from './_components/CategoryFilter.svelte';
	import ProductCard from './_components/ProductCard.svelte';

	import { cartStore } from '$lib/stores/cart.svelte';

	import { menuStore, categoryStore } from '$lib/apis/live-catalog.svelte';

	// --- State ---
	let isSidebarOpen = $state(false);

	// --- Initialization ---
	// We trigger the fetch when the dashboard mounts.
	// Because they are singletons, if you navigate away and back,
	// they keep their data (unless you want to force reload).
	$effect(() => {
		categoryStore.init();
		menuStore.init();
	});

	// --- Derived State ---
	// Read directly from the stores. Svelte makes this reactive automatically.
	const categories = $derived(categoryStore.data);
	const products = $derived(menuStore.data);
	const isLoading = $derived(categoryStore.loading || menuStore.loading);

	// Handle Category Change
	function handleCategoryChange(id: string) {
		menuStore.setCategory(id);
	}
</script>

<div class="flex min-h-screen flex-col">
	<!-- Navigation -->
	<Navbar
		onToggleSidebar={() => (isSidebarOpen = !isSidebarOpen)}
		onToggleCart={() => cartStore.toggleCart()}
		cartItemCount={cartStore.totalItems}
	/>

	<Sidebar open={isSidebarOpen} onClose={() => (isSidebarOpen = false)} />

	<CartDrawer />

	<!-- Main Content -->
	<main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- Category Filter -->
			<div class="mb-6">
				<CategoryFilter
					{categories}
					activeCategory={menuStore.activeCategoryId || 'all'}
					onSelect={handleCategoryChange}
				/>
			</div>

			<!-- Products Grid -->
			{#if isLoading}
				<!-- Loading State -->
				<div class="flex h-64 flex-col items-center justify-center gap-3">
					<Icon icon="lucide:loader-2" class="h-10 w-10 animate-spin text-gray-600" />
					<p class="text-sm text-gray-600">Loading products...</p>
				</div>
			{:else if products.length === 0}
				<!-- Empty State -->
				<div
					class="flex h-64 flex-col items-center justify-center gap-4 rounded-xl bg-white p-6 shadow-sm"
				>
					<div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
						<Icon icon="lucide:shopping-bag" class="h-8 w-8 text-gray-400" />
					</div>
					<div class="text-center">
						<h3 class="mb-1 text-lg font-semibold text-gray-900">No Products Found</h3>
						<p class="text-sm text-gray-600">
							{menuStore.activeCategoryId === 'all'
								? "We don't have any products available at the moment."
								: 'Try selecting a different category.'}
						</p>
					</div>
					{#if menuStore.activeCategoryId !== 'all'}
						<button
							onclick={() => handleCategoryChange('all')}
							class="text-sm cursor-pointer font-medium text-black"
						>
							View All Products
						</button>
					{/if}
				</div>
			{:else}
				<!-- Success State -->
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{#each products as product (product.id)}
						<ProductCard {product} />
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>
