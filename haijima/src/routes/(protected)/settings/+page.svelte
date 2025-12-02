<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';
	import TwoFactor from './_components/TwoFactor.svelte';
	import AccountDel from './_components/AccountDel.svelte';
</script>

<div class="min-h-screen bg-[#fefaef] p-4 md:p-8">
	<div class="mx-auto max-w-4xl space-y-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Settings</h1>
			<p class="mt-2 text-sm text-gray-600">Manage your account security and preferences</p>
		</div>

		{#if settingsStore.error}
			<div
				transition:fade
				class="rounded-lg bg-red-50 p-4 border border-red-200 flex items-center gap-3"
			>
				<Icon icon="lucide:alert-circle" class="text-red-600" />
				<p class="text-sm text-red-700">{settingsStore.error}</p>
				<button
					onclick={() => (settingsStore.error = null)}
					class="ml-auto text-red-500 hover:text-red-700"
				>
					<Icon icon="lucide:x" />
				</button>
			</div>
		{/if}

		<TwoFactor />

		<AccountDel />
	</div>
</div>
