<script lang="ts">
	import { page } from '$app/state';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation'; // Only for programmatic nav (Logout/Login)

	let { open, onClose } = $props<{
		open: boolean;
		onClose: () => void;
	}>();

	const auth = getAuthState();

	async function handleLogout() {
		await auth.logout();
		onClose();
	}

	function isActive(path: string) {
		return page.url.pathname === path;
	}
</script>

{#snippet navLink(iconName: string, label: string, path: string)}
	{@const active = isActive(path)}
	<a
		href={path}
		data-sveltekit-preload-data="hover"
		onclick={onClose}
		class="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all {active
			? 'bg-gray-100 font-medium text-gray-900'
			: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
	>
		<Icon icon={iconName} class="h-4 w-4" />
		<span>{label}</span>
	</a>
{/snippet}

{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none border-0 cursor-default"
		onclick={onClose}
		aria-label="Close sidebar"
	></button>

	<div
		class="fixed z-50 flex flex-col bg-white shadow-2xl transition-all duration-200
        inset-y-0 right-0 left-0 sm:right-auto sm:w-80
        md:inset-auto md:top-16 md:right-4 md:left-auto md:w-64 md:rounded-xl md:border md:border-gray-200"
	>
		<div
			class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 md:hidden"
		>
			<div class="flex items-center gap-2.5">
				<div
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-xs font-bold text-white"
				>
					WK
				</div>
				<span class="text-base font-semibold text-gray-900"> Weddyskitchen </span>
			</div>
			<button
				onclick={onClose}
				class="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
			>
				<Icon icon="lucide:x" class="h-5 w-5" />
			</button>
		</div>

		<button
			onclick={onClose}
			class="absolute top-2 right-2 z-10 hidden rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 md:block"
		>
			<Icon icon="lucide:x" class="h-4 w-4" />
		</button>

		<div class="flex-1 overflow-y-auto">
			{#if !auth.isAuthenticated}
				<div class="space-y-2 border-b border-gray-200 p-3">
					<a
						href="/login"
						onclick={onClose}
						class="block w-full rounded-md bg-green-600 py-2 text-center text-sm font-medium text-white transition hover:bg-green-700"
					>
						Sign In
					</a>
					<a
						href="/signup"
						onclick={onClose}
						class="block w-full rounded-md border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
					>
						Create Account
					</a>
				</div>
			{:else}
				<div class="border-b border-gray-200 p-3">
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700"
						>
							{auth.user?.email?.[0]?.toUpperCase() || 'U'}
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-medium text-gray-900">
								{auth.user?.email?.split('@')[0] || 'User'}
							</div>
							<div class="truncate text-xs text-gray-500">
								{auth.user?.email}
							</div>
						</div>
					</div>
				</div>

				<div class="space-y-0.5 p-3">
					<div class="mb-2 px-2.5 text-xs font-semibold text-gray-500">ACCOUNT</div>

					{@render navLink('lucide:package', 'Orders', '/orders')}

					{@render navLink('lucide:bookmark', 'Saved Addresses', '/address')}

					{@render navLink('lucide:settings', 'Account Settings', 'settings')}
				</div>

				<div class="border-t border-gray-200 p-3">
					<button
						onclick={handleLogout}
						class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-red-600 transition hover:bg-red-50"
					>
						<Icon icon="lucide:log-out" class="h-4 w-4" />
						<span>Sign Out</span>
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
