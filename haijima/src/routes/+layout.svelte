<script lang="ts">
	import { setAuthState } from '$lib/stores/auth.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import Feedback from './_components/feedback.svelte';
	import Footer from './_components/footer.svelte';
	import Navbar from './_components/navbar.svelte';

	import './layout.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Initialize auth state
	const auth = setAuthState(data.user);

	// Sync on data changes
	$effect(() => {
		auth.setUser(data.user);
	});
</script>

<div class="app flex flex-col min-h-screen">
	<Navbar />

	<main class="flex-1 pt-14">
		{@render children()}
	</main>

	<Footer />
	<Feedback />
</div>
