<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Toaster } from 'svelte-sonner';

	import { page, navigating } from '$app/state';

	import type { LayoutData } from './$types';
	import { setAuthState } from '$lib/stores/auth.svelte';

	import Header from '$lib/components/header.svelte';
	import Footer from './_components/footer.svelte';
	import './layout.css';
	import { cartStore } from '$lib/stores/cart.svelte';
	import { deliveryStore } from '$lib/stores/delivery.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// --- Auth State ---
	// 1. Initialize with current data (Runes allow this)
	const auth = setAuthState(untrack(() => data.user));

	// 2. Sync whenever data changes (Fixes the "initial value" warning logic)
	$effect(() => {
		auth.setUser(data.user);
	});

	$effect(() => {
		if (data.user?.email) {
			// User is logged in - use their email
			cartStore.setUserEmail(data.user.email);
			deliveryStore.setUserEmail(data.user.email);
		} else {
			// User is logged out - switch to guest mode
			cartStore.setUserEmail('guest');
			deliveryStore.setUserEmail('guest');
		}
	});

	// --- Navigation Logic ---
	const hiddenPaths = ['/', '/login', '/signup'];

	// ✅ FIX 2: Use page.url directly (no $page)
	let shouldHideNavbar = $derived(
		page.url.pathname.startsWith('/dashboard') || hiddenPaths.includes(page.url.pathname)
	);
</script>

<Toaster richColors position="top-right" />

{#if !shouldHideNavbar}
	<Header />
{/if}

{#if navigating.to}
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
