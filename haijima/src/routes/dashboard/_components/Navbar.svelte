<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { getAuthState } from '$lib/stores/auth.svelte';

	// 1. Props
	let {
		onToggleSidebar,
		onToggleCart,
		cartItemCount = 0
	} = $props<{
		onToggleSidebar: () => void;
		onToggleCart: () => void;
		cartItemCount?: number;
	}>();

	// 2. Auth State
	const auth = getAuthState();

	// Helper for navigation
	function handleLogin() {
		goto('/login');
	}

	function handleSignup() {
		goto('/signup');
	}
</script>

<header class="sticky top-0 z-50 shadow-sm" style="background-color: var(--color-bg-1);">
	<div class="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
		<!-- Left: Hamburger (mobile) + Logo -->
		<div class="flex items-center gap-2 sm:gap-3">
			<!-- Mobile hamburger -->
			<button
				onclick={onToggleSidebar}
				class="flex-shrink-0 rounded-lg p-2 transition hover:bg-white/50 active:bg-white/70 md:hidden"
				aria-label="Toggle menu"
				style="color: var(--color-text);"
			>
				<Icon icon="lucide:menu" class="h-5 w-5" />
			</button>

			<!-- Logo -->
			<a
				href="/"
				class="flex-shrink-0 text-base font-bold sm:text-lg lg:text-xl"
				style="color: var(--color-theme-1); text-decoration: none; font-weight: 500; transition: color 0.2s;"
				onmouseenter={(e) => (e.currentTarget.style.color = 'var(--color-theme-2)')}
				onmouseleave={(e) => (e.currentTarget.style.color = 'var(--color-theme-1)')}
			>
				<span class="inline sm:hidden">WK</span>
				<span class="hidden sm:inline">Weddyskitchen</span>
			</a>
		</div>

		<!-- Right: Auth Buttons / Avatar + Cart -->
		<div class="flex flex-shrink-0 items-center gap-2 sm:gap-3">
			{#if auth.isAuthenticated && auth.user?.email}
				<!-- LOGGED IN: Avatar Button -->
				<button
					onclick={onToggleSidebar}
					class="hidden cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/50 md:flex lg:px-3"
					aria-label="Open account menu"
				>
					<div
						class="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm"
					>
						{auth.user.email[0].toUpperCase()}
					</div>
				</button>
			{:else}
				<!-- GUEST: Login / Signup -->
				<div class="hidden items-center gap-2 md:flex">
					<button
						onclick={handleLogin}
						class="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-white/50"
						style="color: var(--color-text);"
					>
						Login
					</button>
					<button
						onclick={handleSignup}
						class="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition"
						style="background-color: var(--color-theme-1);"
						onmouseenter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-theme-2)')}
						onmouseleave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-theme-1)')}
					>
						Sign Up
					</button>
				</div>
			{/if}

			<!-- Cart Button - Always visible -->
			<button
				onclick={onToggleCart}
				class="relative flex-shrink-0 rounded-lg p-2 transition hover:bg-white/50 active:bg-white/70"
				aria-label="Shopping cart"
				style="color: var(--color-text);"
			>
				<Icon icon="lucide:shopping-cart" class="h-5 w-5 sm:h-6 sm:w-6" />

				<!-- Cart Badge -->
				{#if cartItemCount > 0}
					<span
						class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white sm:-top-1 sm:-right-1 sm:h-5 sm:w-5 sm:text-[10px]"
						style="background-color: var(--color-theme-1);"
					>
						{cartItemCount > 99 ? '99+' : cartItemCount}
					</span>
				{/if}
			</button>
		</div>
	</div>
</header>
