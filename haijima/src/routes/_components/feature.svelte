<script lang="ts">
	import deliveryImg from '$lib/assets/feature-delivery.avif';
	import veggieImg from '$lib/assets/feature-fresh.avif';
	import cartImg from '$lib/assets/feature-cart.avif';

	interface Feature {
		title: string;
		text: string;
		img: string;
	}

	const features: Feature[] = [
		{
			title: 'Fresh food, fast',
			text: 'Order in minutes and get your meal hot and ready, delivered to your door or available for pickup.',
			img: deliveryImg
		},
		{
			title: 'Made with care',
			text: 'Our meals are cooked daily with fresh, locally sourced ingredients.',
			img: veggieImg
		},
		{
			title: 'Easy ordering, anytime',
			text: 'Browse our menu, customize your order, and track delivery—all from your phone in just a few taps.',
			img: cartImg
		}
	];
</script>

<section class="w-full py-24" style="background-color: var(--color-bg-1);">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Section Header -->
		<div class="mb-16 text-center">
			<h2 class="text-4xl font-bold tracking-tight mb-4" style="color: var(--color-text);">
				Why Choose Weddy's
			</h2>
			<p class="text-lg max-w-2xl mx-auto" style="color: var(--color-text-muted);">
				Fresh ingredients, fast delivery, and flavors that bring comfort to your busy day.
			</p>
		</div>

		<!-- Features Grid -->
		<div class="grid gap-8 sm:gap-10 lg:grid-cols-3">
			{#each features as feature, i (i)}
				<div class="group flex flex-col">
					<!-- Image Container -->
					<div
						class="relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 group-hover:shadow-xl"
						style="border: 1px solid var(--color-border);"
					>
						<!-- Subtle overlay on hover -->
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
						></div>

						<enhanced:img
							src={feature.img}
							alt={feature.title}
							class="h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
						/>
					</div>

					<!-- Content -->
					<div class="pt-6">
						<h3
							class="mb-3 text-xl font-bold tracking-tight transition-colors group-hover:text-[var(--color-theme-1)]"
							style="color: var(--color-text);"
						>
							{feature.title}
						</h3>
						<p class="text-base leading-relaxed" style="color: var(--color-text-muted);">
							{feature.text}
						</p>
					</div>

					<!-- Optional: Decorative accent line -->
					<div
						class="mt-4 h-1 w-12 rounded-full transition-all duration-300 group-hover:w-20"
						style="background-color: var(--color-theme-1);"
					></div>
				</div>
			{/each}
		</div>
	</div>
</section>
