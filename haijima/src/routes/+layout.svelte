<script lang="ts">
	import Feedback from './_components/feedback.svelte';
	import Footer from './_components/footer.svelte';
	import Navbar from './_components/navbar.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<div class="app flex flex-col min-h-screen">
	<Navbar />

	<main class="flex-1 pt-14">
		{@render children()}
	</main>

	<Footer />
	<Feedback />
</div>
