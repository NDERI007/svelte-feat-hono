<script lang="ts">
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	// Props:
	// - children: The content to show
	// - role: Optional. If set, requires the user to have this specific role.
	let { children, role }: { children: Snippet; role?: string } = $props();

	const auth = getAuthState();

	$effect(() => {
		// 1. Check if user is logged in at all
		if (!auth.isAuthenticated) {
			// Redirect to login, remembering where they tried to go
			goto(`/login?redirectTo=${window.location.pathname}`);
			return;
		}

		// 2. Check for specific role (e.g., 'admin')
		if (role && auth.user?.role !== role) {
			// User is logged in but unauthorized for this specific section
			goto('/dashboard'); // or '/unauthorized'
		}
	});
</script>

{#if auth.isAuthenticated && (!role || auth.user?.role === role)}
	{@render children()}
{/if}
