<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import Icon from '@iconify/svelte';

	let copied = $state(false);

	function copyCodes() {
		navigator.clipboard.writeText(settingsStore.recoveryCodes.join('\n'));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="p-6">
	<div class="rounded-lg bg-yellow-50 p-4 border border-yellow-100 mb-6">
		<div class="flex gap-3">
			<Icon icon="lucide:alert-triangle" class="text-yellow-600 flex-shrink-0 mt-0.5" />
			<div>
				<h3 class="text-sm font-medium text-yellow-800">Save your recovery codes</h3>
				<p class="mt-1 text-sm text-yellow-700">
					If you lose access to your device, these codes are the only way to recover your account.
					Each code can be used once.
				</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3 mb-6 font-mono text-sm">
		{#each settingsStore.recoveryCodes as code}
			<div
				class="bg-gray-50 border border-gray-200 rounded p-2 text-center text-gray-700 select-all"
			>
				{code}
			</div>
		{/each}
	</div>

	<div class="flex justify-end gap-3">
		<button
			onclick={copyCodes}
			class="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
		>
			{#if copied}
				<Icon icon="lucide:check" class="text-green-600" /> Copied
			{:else}
				<Icon icon="lucide:copy" /> Copy All
			{/if}
		</button>
		<button
			onclick={() => (settingsStore.showRecoveryCodes = false)}
			class="rounded-md bg-green-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
		>
			I have saved them
		</button>
	</div>
</div>
