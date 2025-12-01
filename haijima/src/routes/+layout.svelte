<script lang="ts">
	import { setAuthState } from '$lib/stores/auth.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import Footer from './_components/footer.svelte';
	import './layout.css';
	import { Toaster } from 'svelte-sonner';
	import Header from '$lib/components/header.svelte';
	import { fade } from 'svelte/transition';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Initialize auth state
	const auth = setAuthState(data.user);

	// Sync on data changes
	$effect(() => {
		auth.setUser(data.user);
	});
	const hiddenPaths = ['/', '/login', '/signup'];

	let shouldHideNavbar = $derived(
		page.url.pathname.startsWith('/dashboard') || hiddenPaths.includes(page.url.pathname)
	);
</script>

<Toaster richColors position="top-right" />

{#if !shouldHideNavbar}
	<Header />
{/if}

{#if $navigating}
	<div
		class="fixed top-0 left-0 right-0 z-[100] h-1 bg-green-100"
		transition:fade={{ duration: 100 }}
	>
		<div class="h-full w-1/3 bg-green-600 animate-loading-bar"></div>
	</div>
{/if}

<div class="app flex flex-col min-h-screen">
	<main class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>

<style>
	/* Simple infinite animation */
	@keyframes loading {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(200%);
		}
		100% {
			transform: translateX(-100%);
		}
	}
	.animate-loading-bar {
		animation: loading 1.5s infinite linear;
		width: 50%;
	}
</style>
