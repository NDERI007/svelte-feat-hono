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

<section class="w-full bg-white py-16">
	<div class="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 lg:grid-cols-3">
		{#each features as feature, i (i)}
			<div class="flex flex-col text-left">
				<enhanced:img
					src={feature.img}
					alt={feature.title}
					class="h-64 w-full rounded-lg object-cover"
				/>
				<div class="pt-4">
					<h3 class="mb-2 text-xl font-semibold text-green-900">
						{feature.title}
					</h3>
					<p class="text-green-900/80">{feature.text}</p>
				</div>
			</div>
		{/each}
	</div>
</section>
